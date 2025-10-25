// واجهة الطالب والاختبارات

let currentQuestionIndex = 0;
let studentAnswers = [];
let startTime;
let timerInterval;
let questions = [];
let settings = {};

function initStudent() {
    loadSettings();
    showLoginInterface();
}

function loadSettings() {
    settings = JSON.parse(localStorage.getItem('settings')) || {
        questionsCount: 10,
        loginType: 'open',
        attemptsCount: 1,
        resultsDisplay: 'show-answers'
    };
    
    // تحديد واجهة الدخول المناسبة
    if (settings.loginType === 'open') {
        document.getElementById('open-login').style.display = 'block';
    } else {
        document.getElementById('restricted-login').style.display = 'block';
    }
}

function showLoginInterface() {
    document.getElementById('open-login').style.display = settings.loginType === 'open' ? 'block' : 'none';
    document.getElementById('restricted-login').style.display = settings.loginType === 'restricted' ? 'block' : 'none';
    document.getElementById('test-container').style.display = 'none';
    document.getElementById('results-container').style.display = 'none';
}

function validateRestrictedLogin() {
    const studentId = document.getElementById('student-id-input').value.trim();
    const studentName = document.getElementById('student-name-input').value.trim();
    
    if (!studentId || !studentName) {
        alert('يرجى إدخال جميع البيانات');
        return;
    }
    
    const authorizedStudents = JSON.parse(localStorage.getItem('authorizedStudents')) || [];
    const student = authorizedStudents.find(s => s.id === studentId && s.name === studentName);
    
    if (!student) {
        alert('رقم الهوية/الإقامة أو اسم الطالب غير صحيح');
        return;
    }
    
    if (student.usedAttempts >= settings.attemptsCount) {
        alert('لقد استنفذت عدد المحاولات المسموحة');
        return;
    }
    
    // تحديث عدد المحاولات المستخدمة
    student.usedAttempts = (student.usedAttempts || 0) + 1;
    localStorage.setItem('authorizedStudents', JSON.stringify(authorizedStudents));
    
    startTest(studentName);
}

function startTest(studentName) {
    document.getElementById('open-login').style.display = 'none';
    document.getElementById('restricted-login').style.display = 'none';
    document.getElementById('test-container').style.display = 'block';
    
    // تحميل الأسئلة وعرضها
    loadQuestionsForTest();
    displayCurrentQuestion();
    
    // بدء المؤقت
    startTime = new Date();
    startTimer();
    
    // حفظ اسم الطالب
    localStorage.setItem('currentStudent', studentName);
}

function loadQuestionsForTest() {
    const allQuestions = JSON.parse(localStorage.getItem('questions')) || [];
    
    if (allQuestions.length === 0) {
        alert('لا توجد أسئلة متاحة للاختبار');
        showLoginInterface();
        return;
    }
    
    // تحويل أسئلة الاستيعاب إلى أسئلة فردية
    const flattenedQuestions = [];
    allQuestions.forEach(question => {
        if (question.type === 'reading-comprehension' && question.passageQuestions) {
            // إضافة كل سؤال من أسئلة القطعة كسؤال منفصل
            question.passageQuestions.forEach(passageQ => {
                flattenedQuestions.push({
                    id: passageQ.id,
                    text: passageQ.text,
                    type: 'reading-comprehension-item',
                    options: passageQ.options,
                    correctAnswer: passageQ.correctAnswer,
                    readingPassage: question.readingPassage,
                    parentQuestionId: question.id
                });
            });
        } else {
            flattenedQuestions.push(question);
        }
    });
    
    // اختيار عدد عشوائي من الأسئلة
    const questionsCount = Math.min(settings.questionsCount, flattenedQuestions.length);
    questions = getRandomQuestions(flattenedQuestions, questionsCount);
    
    // تهيئة الإجابات
    studentAnswers = new Array(questions.length).fill(null);
}

function getRandomQuestions(allQuestions, count) {
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function displayCurrentQuestion() {
    const container = document.getElementById('questions-container');
    const question = questions[currentQuestionIndex];
    
    container.innerHTML = '';
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-container';
    
    let questionHTML = `
        <h3>السؤال ${currentQuestionIndex + 1} من ${questions.length}</h3>
    `;
    
    // إضافة قطعة الاستيعاب إذا كان السؤال من نوع استيعاب مقروء
    if (question.type === 'reading-comprehension-item' && question.readingPassage) {
        questionHTML += `
            <div class="reading-passage">
                <h4>اقرأ القطعة التالية ثم أجب عن السؤال:</h4>
                <div class="passage-content">${question.readingPassage}</div>
            </div>
        `;
    }
    
    questionHTML += `
        <p class="question-text">${question.text}</p>
    `;
    
    // إضافة المرفق إذا كان النوع يحتوي على مرفق
    if (question.type === 'multiple-with-media' && question.mediaUrl) {
        questionHTML += `
            <div class="media-attachment">
                ${isYouTubeUrl(question.mediaUrl) ? 
                    `<iframe src="${getYouTubeEmbedUrl(question.mediaUrl)}" frameborder="0" allowfullscreen></iframe>` :
                    `<img src="${question.mediaUrl}" alt="مرفق السؤال">`
                }
            </div>
        `;
    }
    
    questionHTML += `
        <div class="options-container">
            ${question.options.map((option, index) => `
                <div class="option-item">
                    <input type="radio" name="answer" id="option-${index}" value="${index + 1}" 
                           ${studentAnswers[currentQuestionIndex] === index + 1 ? 'checked' : ''}>
                    <label for="option-${index}">${option}</label>
                </div>
            `).join('')}
        </div>
    `;
    
    questionDiv.innerHTML = questionHTML;
    container.appendChild(questionDiv);
    
    // إضافة أزرار التنقل
    const navigationDiv = document.createElement('div');
    navigationDiv.className = 'navigation-buttons';
    navigationDiv.innerHTML = `
        <button class="btn-secondary" onclick="previousQuestion()" ${currentQuestionIndex === 0 ? 'disabled' : ''}>السابق</button>
        <button class="btn-primary" onclick="nextQuestion()">${currentQuestionIndex === questions.length - 1 ? 'إنهاء الاختبار' : 'التالي'}</button>
    `;
    container.appendChild(navigationDiv);
    
    // إضافة مستمعي الأحداث للخيارات
    question.options.forEach((_, index) => {
        document.getElementById(`option-${index}`).addEventListener('change', function() {
            studentAnswers[currentQuestionIndex] = parseInt(this.value);
        });
    });
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayCurrentQuestion();
    }
}

function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        displayCurrentQuestion();
    } else {
        submitTest();
    }
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const currentTime = new Date();
    const elapsedTime = Math.floor((currentTime - startTime) / 1000);
    
    const hours = Math.floor(elapsedTime / 3600);
    const minutes = Math.floor((elapsedTime % 3600) / 60);
    const seconds = elapsedTime % 60;
    
    document.getElementById('timer').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function submitTest() {
    clearInterval(timerInterval);
    
    const endTime = new Date();
    const timeTaken = document.getElementById('timer').textContent;
    
    // حساب النتيجة
    const score = calculateScore();
    const percentage = Math.round((score / questions.length) * 100);
    
    // حفظ نتيجة الطالب
    const studentName = localStorage.getItem('currentStudent');
    const students = JSON.parse(localStorage.getItem('students')) || [];
    
    students.push({
        name: studentName,
        score: score,
        total: questions.length,
        percentage: percentage,
        timeTaken: timeTaken,
        date: new Date().toLocaleDateString('ar-SA')
    });
    
    localStorage.setItem('students', JSON.stringify(students));
    
    // عرض النتائج
    showResults(score, percentage, timeTaken);
}

function calculateScore() {
    let score = 0;
    
    for (let i = 0; i < questions.length; i++) {
        if (studentAnswers[i] === questions[i].correctAnswer) {
            score++;
        }
    }
    
    return score;
}

function showResults(score, percentage, timeTaken) {
    document.getElementById('test-container').style.display = 'none';
    document.getElementById('results-container').style.display = 'block';
    
    const container = document.getElementById('results-container');
    container.innerHTML = '';
    
    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'results-summary';
    
    let resultsHTML = `
        <h2>نتيجة الاختبار</h2>
        <div class="score">${percentage}%</div>
        <p>الإجابات الصحيحة: ${score} من ${questions.length}</p>
        <p class="time-taken">الوقت المستغرق: ${timeTaken}</p>
    `;
    
    // إذا كان الإعداد يسمح بعرض الإجابات
    if (settings.resultsDisplay === 'show-answers') {
        resultsHTML += `
            <div class="questions-review">
                <h3>مراجعة الأسئلة</h3>
                ${questions.map((question, index) => {
                    const studentAnswer = studentAnswers[index];
                    const isCorrect = studentAnswer === question.correctAnswer;
                    
                    return `
                        <div class="question-feedback ${isCorrect ? 'correct' : 'incorrect'}">
                            <h4>السؤال ${index + 1}</h4>
                            ${question.readingPassage ? `
                                <div class="reading-passage">
                                    <strong>قطعة الاستيعاب:</strong>
                                    <div class="passage-content">${question.readingPassage}</div>
                                </div>
                            ` : ''}
                            <p><strong>النص:</strong> ${question.text}</p>
                            <p><strong>إجابتك:</strong> ${studentAnswer ? question.options[studentAnswer - 1] : 'لم تجب'}</p>
                            <p><strong>الإجابة الصحيحة:</strong> ${question.options[question.correctAnswer - 1]}</p>
                            <p class="result ${isCorrect ? 'correct-text' : 'incorrect-text'}">
                                ${isCorrect ? '✓ إجابة صحيحة' : '✗ إجابة خاطئة'}
                            </p>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    resultsHTML += `
        <button class="btn-primary" onclick="location.reload()">إعادة الاختبار</button>
    `;
    
    resultsDiv.innerHTML = resultsHTML;
    container.appendChild(resultsDiv);
}

function isYouTubeUrl(url) {
    return url.includes('youtube.com') || url.includes('youtu.be');
}

function getYouTubeEmbedUrl(url) {
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : url;
}
