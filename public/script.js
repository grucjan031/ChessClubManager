document.addEventListener('DOMContentLoaded', () => {


    const authSelection = document.getElementById('auth-selection');
    const registrationSection = document.getElementById('registration');
    const loginSection = document.getElementById('login');
    const chooseClubPanel = document.getElementById('choose-club-panel');
    const coordinatorPanel = document.getElementById('coordinator-panel');
    const playerPanel = document.getElementById('player-panel');

    const showRegistrationButton = document.getElementById('show-registration');
    const showLoginButton = document.getElementById('show-login');
    const backToSelectionButtonReg = document.getElementById('back-to-selection');
    const backToSelectionButtonLog = document.getElementById('back-to-selection-login');

    const roleSelect = document.getElementById('reg-role');
    const clubNameSection = document.getElementById('club-name-section');

    const registrationForm = document.getElementById('registration-form');
    const loginForm = document.getElementById('login-form');
    const tournamentForm = document.getElementById('tournament-form');
    const addResultsForm = document.getElementById('add-results-form');


    const playersList = document.getElementById('players-list');
    const resultsList = document.getElementById('results-list');
    const clubsList = document.getElementById('clubs-list');

    const resultTournamentSelect = document.getElementById('result-tournament-select');
    const resultPlayerSelect = document.getElementById('result-player-select');
    const gamesPlayedInput = document.getElementById('games-played');
    const winsInput = document.getElementById('wins');
    const drawsInput = document.getElementById('draws');
    const lossesInput = document.getElementById('losses');
    const ratingInput = document.getElementById('rating');


    const coordinatorFooterNav = document.getElementById('coordinator-footer-nav');


    const coordinatorSubsection = document.getElementById('coordinator-subsection');


    function showCoordinatorContent(htmlContent) {
        coordinatorSubsection.innerHTML = htmlContent;
    }


    function showSection(section) {
        document.querySelectorAll('section').forEach(sec => {
            sec.style.display = 'none';
        });
        section.style.display = 'block';
    }

    async function loadUserPanel() {
        const token = localStorage.getItem('token');
        if (!token) {
            showSection(authSelection);
            return;
        }

        try {
            const response = await fetch('/api/profile', {
                headers: { 'Authorization': token }
            });

            if (!response.ok) {
                alert('Błąd pobierania profilu. Zaloguj się ponownie.');
                localStorage.removeItem('token');
                showSection(authSelection);
                return;
            }

            const user = await response.json();
            if (user.role === 'player') {
                if (!user.club) {
                    showChooseClubPanel();
                } else {
                    showPlayerPanel();
                }
            } else if (user.role === 'coordinator') {
                showCoordinatorPanel();
            }
        } catch (error) {
            console.error('Błąd podczas ładowania panelu użytkownika:', error);
            alert('Wystąpił błąd. Zaloguj się ponownie.');
            localStorage.removeItem('token');
            showSection(authSelection);
        }
    }

    async function showChooseClubPanel() {
        try {
            const response = await fetch('/api/clubs', {
                headers: { 'Authorization': localStorage.getItem('token') }
            });
            if (!response.ok) {
                alert('Nie można załadować listy klubów.');
                return;
            }
            const clubs = await response.json();

            clubsList.innerHTML = '';
            clubs.forEach(club => {
                const li = document.createElement('li');
                li.textContent = club.name;

                const joinButton = document.createElement('button');
                joinButton.textContent = 'Dołącz';
                joinButton.addEventListener('click', async () => {
                    try {
                        const joinResponse = await fetch('/api/clubs/join', {
                            method: 'POST',
                            headers: {
                                'Authorization': localStorage.getItem('token'),
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ clubId: club._id })
                        });
                        if (joinResponse.ok) {
                            alert('Dołączyłeś do klubu!');
                            loadUserPanel();
                        } else {
                            const errorData = await joinResponse.json();
                            alert(`Błąd: ${errorData.error}`);
                        }
                    } catch (error) {
                        console.error('Błąd podczas dołączania do klubu:', error);
                    }
                });

                li.appendChild(joinButton);
                clubsList.appendChild(li);
            });

            showSection(chooseClubPanel);
        } catch (error) {
            console.error('Błąd podczas pobierania listy klubów:', error);
            alert('Nie można załadować listy klubów.');
        }
    }

    async function showCoordinatorPanel() {
        showSection(coordinatorPanel);

        coordinatorFooterNav.style.display = 'block';
        const token = localStorage.getItem('token');

        try {
            const response = await fetch('/api/players', {
                headers: { 'Authorization': token }
            });
            if (response.ok) {
                const players = await response.json();
                playersList.innerHTML = '';
                players.forEach(player => {
                    const li = document.createElement('li');
                    li.textContent = player.email;
                    playersList.appendChild(li);
                });
            } else {
                alert('Nie można załadować listy zawodników.');
            }
        } catch (error) {
            console.error('Błąd podczas pobierania zawodników:', error);
        }

        try {
            const tournamentsResp = await fetch('/api/tournaments', {
                headers: { 'Authorization': token }
            });
            if (tournamentsResp.ok) {
                const tournaments = await tournamentsResp.json();
                resultTournamentSelect.innerHTML = '';
                tournaments.forEach(t => {
                    const option = document.createElement('option');
                    option.value = t._id;   // zakładam, że turniej ma _id
                    option.textContent = t.name;
                    resultTournamentSelect.appendChild(option);
                });
            } else {
                alert('Nie można pobrać listy turniejów.');
            }
        } catch (error) {
            console.error('Błąd podczas pobierania turniejów:', error);
        }

        try {
            const playersResp = await fetch('/api/players', {
                headers: { 'Authorization': token }
            });
            if (playersResp.ok) {
                const players = await playersResp.json();
                resultPlayerSelect.innerHTML = '';
                players.forEach(p => {
                    const option = document.createElement('option');
                    option.value = p._id; 
                    option.textContent = p.email;
                    resultPlayerSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Błąd podczas pobierania zawodników do wyników:', error);
        }
    }

    async function showPlayerPanel() {
        showSection(playerPanel);


        try {
            const response = await fetch('/api/results', {
                headers: { 'Authorization': localStorage.getItem('token') }
            });
            if (response.ok) {
                const results = await response.json();
                resultsList.innerHTML = '';
                results.forEach(result => {
                    const li = document.createElement('li');
                    li.textContent =
                        `${result.tournament.name} - ` +
                        `Rozegrane: ${result.gamesPlayed}, ` +
                        `Wygrane: ${result.wins}, ` +
                        `Remisy: ${result.draws}, ` +
                        `Porażki: ${result.losses}, ` +
                        `Ocena: ${result.rating || 'Brak'}`;
                    resultsList.appendChild(li);
                });
            } else {
                alert('Nie można załadować wyników.');
            }
        } catch (error) {
            console.error('Błąd podczas pobierania wyników:', error);
        }
    }


    showRegistrationButton.addEventListener('click', () => showSection(registrationSection));
    showLoginButton.addEventListener('click', () => showSection(loginSection));
    backToSelectionButtonReg.addEventListener('click', () => showSection(authSelection));
    backToSelectionButtonLog.addEventListener('click', () => showSection(authSelection));


    roleSelect.addEventListener('change', () => {
        if (roleSelect.value === 'coordinator') {
            clubNameSection.style.display = 'block';
        } else {
            clubNameSection.style.display = 'none';
        }
    });


    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const role = roleSelect.value;
        const clubName = role === 'coordinator'
            ? document.getElementById('reg-club-name').value
            : null;

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, role, clubName })
            });

            if (response.ok) {
                alert('Rejestracja zakończona sukcesem! Możesz się teraz zalogować.');
                registrationForm.reset();
                clubNameSection.style.display = 'none';
                showSection(authSelection);
            } else {
                const error = await response.json();
                alert(`Błąd: ${error.error}`);
            }
        } catch (error) {
            console.error('Błąd podczas rejestracji:', error);
            alert('Wystąpił błąd podczas rejestracji. Spróbuj ponownie później.');
        }
    });


    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.token);
                alert('Zalogowano pomyślnie!');
                loginForm.reset();

                loadUserPanel();
            } else {
                const error = await response.json();
                alert(`Błąd: ${error.error}`);
            }
        } catch (error) {
            console.error('Błąd podczas logowania:', error);
            alert('Wystąpił błąd podczas logowania. Spróbuj ponownie później.');
        }
    });


    tournamentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('tournament-name').value;
        const date = document.getElementById('tournament-date').value;
        const description = document.getElementById('tournament-description').value;
        const token = localStorage.getItem('token');

        try {
            const response = await fetch('/api/tournaments', {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, date, description })
            });

            if (response.ok) {
                alert('Turniej dodany pomyślnie!');
                tournamentForm.reset();
            } else {
                const error = await response.json();
                alert(`Błąd: ${error.error}`);
            }
        } catch (error) {
            console.error('Błąd podczas dodawania turnieju:', error);
        }
    });


    addResultsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        const tournamentId = resultTournamentSelect.value;
        const playerId = resultPlayerSelect.value;
        const gamesPlayed = parseInt(gamesPlayedInput.value) || 0;
        const wins = parseInt(winsInput.value) || 0;
        const draws = parseInt(drawsInput.value) || 0;
        const losses = parseInt(lossesInput.value) || 0;

        const ratingValue = ratingInput.value ? parseInt(ratingInput.value) : null;


        try {
            const response = await fetch('/api/results', {
                method: 'POST', 
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tournamentId,
                    playerId,
                    gamesPlayed,
                    wins,
                    draws,
                    losses,
                    rating: ratingValue
                })
            });

            if (response.ok) {
                alert('Wyniki zostały zapisane!');
                addResultsForm.reset();
            } else {
                const error = await response.json();
                alert(`Błąd: ${error.error}`);
            }
        } catch (error) {
            console.error('Błąd podczas zapisywania wyników:', error);
            alert('Nie udało się zapisać wyników.');
        }
    });
    const logoutButtons = document.querySelectorAll('.logout-btn');

    logoutButtons.forEach(button => {
        button.addEventListener('click', () => {
            localStorage.removeItem('token');

            alert('Wylogowano pomyślnie!');
            showSection(document.getElementById('auth-selection'));
        });
    });

    loadUserPanel();
});