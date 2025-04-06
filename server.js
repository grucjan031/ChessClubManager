const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'supersecret';

const MONGO_URI = 'mongodb://localhost:27017/projektPAI';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Połączono z MongoDB'))
    .catch(err => console.error('Błąd połączenia z MongoDB:', err));

app.use(express.json());

const ClubSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    coordinator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const TournamentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    date: { type: Date, required: true },
    description: { type: String, required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' }
});

const ResultSchema = new mongoose.Schema({
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
    gamesPlayed: { type: Number, required: true },
    wins: { type: Number, required: true },
    draws: { type: Number, required: true },
    losses: { type: Number, required: true },
    rating: { type: Number, min: 1, max: 10 }
});

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, match: /.+\@.+\..+/ },
    password: { type: String, required: true },
    role: { type: String, enum: ['coordinator', 'player'], required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' }
});

const Club = mongoose.model('Club', ClubSchema);
const User = mongoose.model('User', UserSchema);
const Tournament = mongoose.model('Tournament', TournamentSchema);
const Result = mongoose.model('Result', ResultSchema);

const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Brak tokenu uwierzytelniającego' });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ error: 'Nieprawidłowy token' });
    }
};

app.get('/api/players', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'coordinator') {
            return res.status(403).json({ error: 'Brak dostępu' });
        }

        const club = await Club.findOne({ coordinator: req.user.id }).populate('players');
        if (!club) {
            return res.status(404).json({ error: 'Nie znaleziono klubu' });
        }

        res.json(club.players);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tournaments', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'coordinator') {
            return res.status(403).json({ error: 'Brak dostępu' });
        }

        const { name, date, description } = req.body;
        const club = await Club.findOne({ coordinator: req.user.id });

        if (!club) {
            return res.status(404).json({ error: 'Nie znaleziono klubu' });
        }

        const tournament = new Tournament({ name, date, description, club: club._id });
        await tournament.save();

        res.status(201).json({ message: 'Turniej został dodany' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/register', async (req, res) => {
    const { email, password, role, clubName } = req.body;
    console.log('Dane rejestracji:', req.body);

    if (!email || !password || !role) {
        return res.status(400).json({ error: 'Brak wymaganych danych.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        let club = null;
        if (role === 'coordinator') {
            if (!clubName) {
                return res.status(400).json({ error: 'Nazwa klubu jest wymagana dla koordynatora.' });
            }
            club = new Club({ name: clubName });
            await club.save();
        }

        const user = new User({ email, password: hashedPassword, role, club: club ? club._id : null });
        await user.save();

        if (club) {
            club.coordinator = user._id;
            await club.save();
        }

        console.log('Zarejestrowano użytkownika:', user);
        res.status(201).json({ message: 'Użytkownik zarejestrowany.' });
    } catch (error) {
        console.error('Błąd podczas rejestracji:', error);
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/clubs', authenticate, async (req, res) => {
    try {
        const clubs = await Club.find({}, 'name');
        res.json(clubs);
    } catch (error) {
        res.status(500).json({ error: 'Błąd podczas pobierania listy klubów.' });
    }
});
app.post('/api/clubs/join', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'player') {
            return res.status(403).json({ error: 'Tylko zawodnicy mogą dołączać do klubów.' });
        }

        const { clubId } = req.body;
        const club = await Club.findById(clubId);
        if (!club) {
            return res.status(404).json({ error: 'Nie znaleziono klubu.' });
        }

        const user = await User.findById(req.user.id);
        if (user.club) {
            return res.status(400).json({ error: 'Jesteś już przypisany do klubu.' });
        }

        user.club = club._id;
        await user.save();

        club.players.push(user._id);
        await club.save();

        res.json({ message: 'Dołączyłeś do klubu.' });
    } catch (error) {
        res.status(500).json({ error: 'Błąd podczas dołączania do klubu.' });
    }
});


app.post('/api/login', async (req, res) => {
    console.log('Otrzymane dane logowania:', req.body);
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            console.log('Użytkownik nie znaleziony');
            return res.status(401).json({ error: 'Nieprawidłowe dane logowania.' });
        }

        const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
        if (!isPasswordValid) {
            console.log('Nieprawidłowe hasło');
            return res.status(401).json({ error: 'Nieprawidłowe dane logowania.' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
        console.log('Zalogowano pomyślnie:', { id: user._id, role: user.role });
        res.json({ token });
    } catch (error) {
        console.error('Błąd podczas logowania:', error);
        res.status(500).json({ error: 'Wystąpił błąd podczas logowania.' });
    }
});
app.get('/api/profile', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'Użytkownik nie znaleziony.' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Błąd serwera.' });
    }
});

app.get('/api/tournaments', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'coordinator') {
            return res.status(403).json({ error: 'Brak dostępu' });
        }

        const club = await Club.findOne({ coordinator: req.user.id });
        if (!club) {
            return res.status(404).json({ error: 'Nie znaleziono Twojego klubu' });
        }
        const tournaments = await Tournament.find({ club: club._id });

        res.json(tournaments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/results', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'coordinator') {
            return res.status(403).json({ error: 'Brak dostępu. Tylko koordynator może zapisywać wyniki.' });
        }

        const {
            tournamentId,
            playerId,
            gamesPlayed,
            wins,
            draws,
            losses,
            rating
        } = req.body;

        if (!tournamentId || !playerId) {
            return res.status(400).json({ error: 'Brak wymaganych danych (tournamentId, playerId).' });
        }

        const coordinator = await User.findById(req.user.id);
        if (!coordinator) {
            return res.status(404).json({ error: 'Koordynator nie znaleziony.' });
        }
        const club = await Club.findOne({ coordinator: coordinator._id });
        if (!club) {
            return res.status(404).json({ error: 'Nie znaleziono klubu powiązanego z tym koordynatorem.' });
        }

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
            return res.status(404).json({ error: 'Nie znaleziono turnieju o podanym ID.' });
        }
        if (tournament.club.toString() !== club._id.toString()) {
            return res.status(403).json({ error: 'Turniej nie należy do Twojego klubu.' });
        }

        const player = await User.findById(playerId);
        if (!player) {
            return res.status(404).json({ error: 'Nie znaleziono zawodnika o podanym ID.' });
        }
        if (!player.club || player.club.toString() !== club._id.toString()) {
            return res.status(403).json({ error: 'Zawodnik nie należy do Twojego klubu.' });
        }

        const existingResult = await Result.findOne({
            player: playerId,
            tournament: tournamentId
        });
        if (existingResult) {
            return res.status(400).json({
                error: 'Wyniki dla tego zawodnika w tym turnieju zostały już dodane.'
            });
        }

        if (wins + draws + losses !== gamesPlayed) {
            return res.status(400).json({ error: 'Liczba zwycięstw + porazek + remisów przekracza liczbę meczów!' });
        }

        const newResult = new Result({
            player: player._id,
            tournament: tournament._id,
            gamesPlayed,
            wins,
            draws,
            losses,
            rating 
        });

        await newResult.save();

        return res.status(201).json({ message: 'Wyniki zostały zapisane pomyślnie.' });
    } catch (error) {
        console.error('Błąd podczas zapisywania wyników:', error);
        res.status(500).json({ error: 'Wystąpił błąd serwera przy dodawaniu wyników.' });
    }
});

app.get('/api/results', authenticate, async (req, res) => {
    try {
        if (req.user.role === 'player') {
            const results = await Result.find({ player: req.user.id }).populate('tournament');
            return res.json(results);
        } else if (req.user.role === 'coordinator') {
            const club = await Club.findOne({ coordinator: req.user.id });
            if (!club) {
                return res.status(404).json({ error: 'Nie znaleziono klubu dla koordynatora' });
            }
            const playerIds = club.players;
            const results = await Result.find({ player: { $in: playerIds } }).populate('tournament player');
            return res.json(results);
        } else {
            return res.status(403).json({ error: 'Brak dostępu. Musisz być graczem lub koordynatorem.' });
        }
    } catch (error) {
        console.error('/api/results error:', error);
        res.status(500).json({ error: error.message });
    }
});


app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});
