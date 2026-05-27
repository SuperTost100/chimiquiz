/* ═══════════════════════════════════════════════
   CHIMIQUIZ — Application Logic
   ═══════════════════════════════════════════════ */

(function () {
    "use strict";

    // ─── Constants ───
    const TOTAL_QUESTIONS = 15;
    const TEST_DURATION = 25 * 60; // seconds
    const POINTS_CORRECT = 0.6;
    const POINTS_WRONG = -0.12;
    const MAX_SCORE = 9;
    const PASS_THRESHOLD = 6;

    // ─── State ───
    let allQuizzes = [];
    let testQuestions = []; // 15 selected questions
    let userAnswers = [];   // user's selected option letter or null
    let flagged = [];        // boolean array
    let currentIndex = 0;
    let timeRemaining = TEST_DURATION;
    let timerInterval = null;
    let testActive = false;

    // ─── DOM refs ───
    const screenStart = document.getElementById("screen-start");
    const screenQuiz = document.getElementById("screen-quiz");
    const screenResults = document.getElementById("screen-results");

    const btnStart = document.getElementById("btn-start");
    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");
    const btnFlag = document.getElementById("btn-flag");
    const flagText = document.getElementById("flag-text");
    const btnToggleNav = document.getElementById("btn-toggle-nav");
    const btnSubmitTest = document.getElementById("btn-submit-test");
    const btnRestart = document.getElementById("btn-restart");

    const timerDisplay = document.getElementById("timer-display");
    const timerEl = document.getElementById("timer");
    const questionCounter = document.getElementById("question-counter");
    const questionText = document.getElementById("question-text");
    const optionsContainer = document.getElementById("options-container");
    const questionNav = document.getElementById("question-nav");
    const navGrid = document.getElementById("nav-grid");

    // Modal
    const modalOverlay = document.getElementById("modal-overlay");
    const modalAnswered = document.getElementById("modal-answered");
    const btnModalCancel = document.getElementById("btn-modal-cancel");
    const btnModalConfirm = document.getElementById("btn-modal-confirm");

    // Abandon modal
    const modalAbandon = document.getElementById("modal-abandon");
    const btnAbandonCancel = document.getElementById("btn-abandon-cancel");
    const btnAbandonConfirm = document.getElementById("btn-abandon-confirm");

    // Header logo link
    const headerLogoLink = document.getElementById("header-logo-link");

    // Results
    const resultEmoji = document.getElementById("result-emoji");
    const resultTitle = document.getElementById("result-title");
    const resultSubtitle = document.getElementById("result-subtitle");
    const scoreValue = document.getElementById("score-value");
    const ringProgress = document.getElementById("ring-progress");
    const statCorrect = document.getElementById("stat-correct");
    const statWrong = document.getElementById("stat-wrong");
    const statSkipped = document.getElementById("stat-skipped");
    const reviewList = document.getElementById("review-list");

    // ─── Seeded Random ───
    function seededRandom(seed) {
        // Simple mulberry32 PRNG
        let t = (seed + 0x6D2B79F5) | 0;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    // ─── Load Quiz Data ───
    async function loadQuizzes() {
        try {
            const resp = await fetch("https://api.poliquiz.it/course/2/quizzes");
            const result = await resp.json();
            
            // Filter questions without a correct answer and map to our format
            allQuizzes = result.data
                .filter(q => q.right_answer_index !== -1)
                .map((q, index) => {
                    const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                    const optionsObj = {};
                    q.answers.forEach((ans, i) => {
                        if (i < letters.length) {
                            optionsObj[letters[i]] = ans;
                        }
                    });
                    
                    return {
                        number: index + 1,
                        question: q.question,
                        options: optionsObj,
                        correct_answer: letters[q.right_answer_index],
                        original_number: q.id,
                        source_file: "api.poliquiz.it"
                    };
                });
        } catch (e) {
            console.error("Failed to load quizzes from API", e);
            alert("Errore nel caricamento delle domande tramite API.");
        }
    }

    // ─── Select 15 Random Questions ───
    function selectQuestions() {
        const selected = [];
        const usedIndices = new Set();

        // First seed: current seconds
        let seed = Math.floor(Date.now() / 1000);

        for (let i = 0; i < TOTAL_QUESTIONS; i++) {
            let idx;
            let attempts = 0;
            do {
                const r = seededRandom(seed);
                idx = Math.floor(r * allQuizzes.length);
                if (usedIndices.has(idx)) {
                    seed = seed + 64;
                    attempts++;
                } else {
                    break;
                }
            } while (attempts < 1000);

            usedIndices.add(idx);
            selected.push(JSON.parse(JSON.stringify(allQuizzes[idx]))); // deep copy

            // Next seed: question number of selected question
            seed = allQuizzes[idx].number;
        }

        return selected;
    }

    // ─── Screen management ───
    function showScreen(screen) {
        [screenStart, screenQuiz, screenResults].forEach(s => s.classList.remove("active"));
        screen.classList.add("active");
    }

    // ─── Timer ───
    function startTimer() {
        timeRemaining = TEST_DURATION;
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();

            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                endTest();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const min = Math.floor(timeRemaining / 60);
        const sec = timeRemaining % 60;
        timerDisplay.textContent = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;

        timerEl.classList.remove("warning", "danger");
        if (timeRemaining <= 60) {
            timerEl.classList.add("danger");
        } else if (timeRemaining <= 300) {
            timerEl.classList.add("warning");
        }
    }

    // ─── Render Question ───
    function renderQuestion() {
        const q = testQuestions[currentIndex];
        questionCounter.textContent = `Domanda ${currentIndex + 1} di ${TOTAL_QUESTIONS}`;
        questionText.textContent = q.question;

        // Flag state
        if (flagged[currentIndex]) {
            btnFlag.classList.add("active");
            flagText.textContent = "Segnata";
        } else {
            btnFlag.classList.remove("active");
            flagText.textContent = "Segna";
        }

        // Options
        optionsContainer.innerHTML = "";
        const optionKeys = Object.keys(q.options).sort();
        optionKeys.forEach(key => {
            const btn = document.createElement("button");
            btn.className = "option-btn";
            if (userAnswers[currentIndex] === key) {
                btn.classList.add("selected");
            }
            btn.innerHTML = `
                <span class="option-letter">${key}</span>
                <span class="option-text">${q.options[key]}</span>
            `;
            btn.addEventListener("click", () => selectOption(key));
            optionsContainer.appendChild(btn);
        });

        // Nav buttons
        btnPrev.disabled = currentIndex === 0;
        btnNext.querySelector("span").textContent =
            currentIndex === TOTAL_QUESTIONS - 1 ? "Consegna" : "Prossima domanda";

        updateNavGrid();

        if (window.MathJax) {
            MathJax.typesetPromise([questionText, optionsContainer]).catch(function (err) {
                console.error("MathJax typeset failed", err);
            });
        }
    }

    function selectOption(key) {
        userAnswers[currentIndex] = key;
        renderQuestion();
    }

    // ─── Navigation Grid ───
    function buildNavGrid() {
        navGrid.innerHTML = "";
        for (let i = 0; i < TOTAL_QUESTIONS; i++) {
            const btn = document.createElement("button");
            btn.className = "nav-btn";
            btn.textContent = i + 1;
            btn.addEventListener("click", () => goToQuestion(i));
            navGrid.appendChild(btn);
        }
        updateNavGrid();
    }

    function updateNavGrid() {
        const btns = navGrid.querySelectorAll(".nav-btn");
        btns.forEach((btn, i) => {
            btn.classList.remove("current", "answered", "flagged");
            if (i === currentIndex) btn.classList.add("current");
            if (userAnswers[i] !== null) btn.classList.add("answered");
            if (flagged[i]) btn.classList.add("flagged");
        });
    }

    function goToQuestion(idx) {
        currentIndex = idx;
        renderQuestion();
    }

    // ─── End Test ───
    function endTest() {
        testActive = false;
        if (timerInterval) clearInterval(timerInterval);
        showScreen(screenResults);
        questionNav.classList.add("hidden");
        computeResults();
    }

    function computeResults() {
        let correct = 0;
        let wrong = 0;
        let skipped = 0;

        testQuestions.forEach((q, i) => {
            const answer = userAnswers[i];
            if (answer === null) {
                skipped++;
            } else if (answer === q.correct_answer) {
                correct++;
            } else {
                wrong++;
            }
        });

        const score = Math.max(0, correct * POINTS_CORRECT + wrong * POINTS_WRONG);
        const roundedScore = Math.round(score * 100) / 100;
        const passed = roundedScore >= PASS_THRESHOLD;

        // Update verdict
        resultEmoji.textContent = passed ? "🎉" : "😞";
        resultTitle.textContent = passed ? "Test Superato!" : "Test Non Superato";
        resultTitle.className = `result-title ${passed ? "passed" : "failed"}`;
        resultSubtitle.textContent = passed
            ? `Complimenti! Hai ottenuto ${roundedScore} su ${MAX_SCORE}.`
            : `Hai ottenuto ${roundedScore} su ${MAX_SCORE}. Servivano almeno ${PASS_THRESHOLD}.`;

        // Score value
        scoreValue.textContent = roundedScore.toFixed(2);

        // Ring animation
        const pct = Math.min(roundedScore / MAX_SCORE, 1);
        const circumference = 2 * Math.PI * 52; // r=52
        ringProgress.classList.remove("passed", "failed");
        ringProgress.classList.add(passed ? "passed" : "failed");
        setTimeout(() => {
            ringProgress.style.strokeDashoffset = circumference * (1 - pct);
        }, 100);

        // Stats
        statCorrect.textContent = correct;
        statWrong.textContent = wrong;
        statSkipped.textContent = skipped;

        // Review list
        reviewList.innerHTML = "";
        testQuestions.forEach((q, i) => {
            const answer = userAnswers[i];
            let status;
            if (answer === null) status = "skipped";
            else if (answer === q.correct_answer) status = "correct";
            else status = "wrong";

            const item = document.createElement("div");
            item.className = `review-item ${status}`;

            const badgeText = status === "correct" ? "Corretta" : status === "wrong" ? "Errata" : "Non data";

            item.innerHTML = `
                <div class="review-item-header">
                    <div class="review-q-info">
                        <span class="review-q-num">${i + 1}</span>
                        <span class="review-q-text">${q.question}</span>
                    </div>
                    <span class="review-badge">${badgeText}</span>
                    <svg class="review-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <div class="review-details">
                    <p class="review-full-question">${q.question}</p>
                    ${buildReviewOptions(q, answer)}
                </div>
            `;

            // Toggle expand
            item.querySelector(".review-item-header").addEventListener("click", () => {
                item.classList.toggle("open");
            });

            reviewList.appendChild(item);
        });

        if (window.MathJax) {
            MathJax.typesetPromise([reviewList]).catch(function (err) {
                console.error("MathJax typeset failed", err);
            });
        }
    }

    function buildReviewOptions(q, userAnswer) {
        const keys = Object.keys(q.options).sort();
        return keys.map(key => {
            const isCorrectOption = key === q.correct_answer;
            const isUserWrongChoice = key === userAnswer && userAnswer !== q.correct_answer;

            let cls = "review-option";
            let label = "";

            if (isCorrectOption) {
                cls += " is-correct";
                label = `<span class="review-option-label">✓ Corretta</span>`;
            }
            if (isUserWrongChoice) {
                cls += " is-wrong";
                label = `<span class="review-option-label">✗ La tua risposta</span>`;
            }

            return `
                <div class="${cls}">
                    <span class="option-letter">${key}</span>
                    <span class="option-text">${q.options[key]}</span>
                    ${label}
                </div>
            `;
        }).join("");
    }

    // ─── Start Test ───
    function startTest() {
        testQuestions = selectQuestions();
        userAnswers = new Array(TOTAL_QUESTIONS).fill(null);
        flagged = new Array(TOTAL_QUESTIONS).fill(false);
        currentIndex = 0;
        testActive = true;

        // Reset ring for next test
        ringProgress.style.strokeDashoffset = 326.73;

        showScreen(screenQuiz);
        buildNavGrid();
        renderQuestion();
        startTimer();
        questionNav.classList.add("hidden");
    }

    // ─── Event Listeners ───
    btnStart.addEventListener("click", startTest);

    btnNext.addEventListener("click", () => {
        if (currentIndex < TOTAL_QUESTIONS - 1) {
            currentIndex++;
            renderQuestion();
        } else {
            // Last question → submit
            showSubmitModal();
        }
    });

    btnPrev.addEventListener("click", () => {
        if (currentIndex > 0) {
            currentIndex--;
            renderQuestion();
        }
    });

    btnFlag.addEventListener("click", () => {
        flagged[currentIndex] = !flagged[currentIndex];
        renderQuestion();
    });

    btnToggleNav.addEventListener("click", () => {
        questionNav.classList.toggle("hidden");
    });

    btnSubmitTest.addEventListener("click", showSubmitModal);

    function showSubmitModal() {
        const answered = userAnswers.filter(a => a !== null).length;
        modalAnswered.textContent = answered;
        modalOverlay.classList.remove("hidden");
    }

    btnModalCancel.addEventListener("click", () => {
        modalOverlay.classList.add("hidden");
    });

    btnModalConfirm.addEventListener("click", () => {
        modalOverlay.classList.add("hidden");
        endTest();
    });

    btnRestart.addEventListener("click", () => {
        startTest();
    });

    // ─── Results logo → back to home ───
    const resultsLogoLink = document.getElementById("results-logo-link");
    resultsLogoLink.addEventListener("click", (e) => {
        e.preventDefault();
        showScreen(screenStart);
    });

    // ─── Header logo → abandon test ───
    headerLogoLink.addEventListener("click", (e) => {
        e.preventDefault();
        if (testActive) {
            modalAbandon.classList.remove("hidden");
        }
    });

    btnAbandonCancel.addEventListener("click", () => {
        modalAbandon.classList.add("hidden");
    });

    btnAbandonConfirm.addEventListener("click", () => {
        modalAbandon.classList.add("hidden");
        testActive = false;
        if (timerInterval) clearInterval(timerInterval);
        questionNav.classList.add("hidden");
        showScreen(screenStart);
    });

    // ─── Warn before leaving the page during a test ───
    window.addEventListener("beforeunload", (e) => {
        if (testActive) {
            e.preventDefault();
            // Modern browsers show a generic message
            e.returnValue = "";
        }
    });

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
        if (!testActive) return;

        if (e.key === "ArrowRight" || e.key === "Enter") {
            if (currentIndex < TOTAL_QUESTIONS - 1) {
                currentIndex++;
                renderQuestion();
            }
        } else if (e.key === "ArrowLeft") {
            if (currentIndex > 0) {
                currentIndex--;
                renderQuestion();
            }
        } else if (e.key === "f" || e.key === "F") {
            flagged[currentIndex] = !flagged[currentIndex];
            renderQuestion();
        } else if (e.key >= "1" && e.key <= "5") {
            const optionKeys = Object.keys(testQuestions[currentIndex].options).sort();
            const idx = parseInt(e.key) - 1;
            if (idx < optionKeys.length) {
                selectOption(optionKeys[idx]);
            }
        }
    });

    // ─── Init ───
    loadQuizzes();
})();
