// واجهة الطالب والاختبارات مع Supabase

let currentQuestionIndex = 0;
let studentAnswers = [];
let startTime;
let timerInterval;
let questions = [];
let settings = {};

async function initStudent() {
    await loadSettings();
    showLoginInterface();
}

async function loadSettings() {
    try {
        const { data, error } = await supabase.rpc('get_settings');
        
        if (error) throw error;
        
        settings = data || {
            questionsCount: 10,
            loginType: 'open',
            attemptsCount: 1,
            resultsDisplay: 'show-answers'
        };
        
        showLoginInterface();
    } catch (error) {
        console.error('Error loading settings:', error);
        // استخدام إعدادات افتراضية في حالة الخطأ
        settings = {
            questionsCount: 10,
            loginType: 'open',
            attemptsCount: 1,
            resultsDisplay: 'show-answers'
        };
        showLoginInterface();
    }
}

function showLoginInterface() {
    document.getElementById('open-login').style.display = settings.loginType === 'open' ? 'block' : 'none';
    document.getElementById('restricted-login').style.display = settings.loginType === 'restricted' ? 'block' : 'none';
    document.getElementById('test-container').style.display = 'none';
    document.getElementById('results-container').style.display = 'none';
}

async function validateRestrictedLogin() {
    const studentId = document.getElementById('student-id-input').value.trim();
    const studentName = document.getElementById('student-name-input').value.trim();
    
    if (!studentId || !studentName) {
        alert('يرجى إدخال جميع البيانات');
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('authorized_students')
            .select('*')
            .eq('student_id', studentId)
            .eq('student_name', studentName)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                alert('رقم الهوية/الإقامة أو اسم الطالب غير صحيح');
            } else {
                throw error;
            }
            return;
        }
        
        if (data) {
            if (data.used_attempts >= data.max_attempts) {
                alert('لقد استنفذت عدد المحاولات المسموحة');
                return;
            }
            
            // تحديث عدد المحاولات المستخدمة
            await supabase
                .from('authorized_students')
                .update({ 
                    used_attempts: (data.used_attempts || 0) + 1 
                })
                .eq('id', data.id);
            
            startTest(studentName);
        }
    } catch (error) {
        console.error('Login validation error:', error);
        alert('حدث خطأ في التحقق من البيانات');
    }
}

function startTest(studentName) {
    document.getElementById('open-login').style.display = 'none';
    document.getElementById('restricted-login').style.display = 'none';
    document.getElementById('test-container').style.display = 'block';
    
    loadQuestionsForTest();
    displayCurrentQuestion();
    
    startTime = new Date();
    startTimer();
    
    localStorage.setItem('currentStudent', studentName);
}

async function loadQuestionsForTest() {
    try {
        const allQuestions = await fetchData('questions');
        
        if (allQuestions.length === 0) {
            alert('لا توجد أسئلة متاحة للاختبار');
            showLoginInterface();
            return;
        }
        
        // تحويل أسئلة الاستيعاب إلى أسئلة فردية
        const flattenedQuestions = [];
        allQuestions.forEach(question => {
            if (question.question_type === 'reading-comprehension' && question.passage_questions) {
                question.passage_questions.forEach(passageQ => {
                    flattenedQuestions.push({
                        id: passageQ.id,
                        text: passageQ.text,
                        type: 'reading-comprehension-item',
                        options: passageQ.options,
                        correctAnswer: passageQ.correctAnswer,
                        readingPassage: question.reading_passage,
                        parentQuestionId: question.id
                    });
                });
            } else {
                flattenedQuestions.push({
                    id: question.id,
                    text: question.question_text,
                    type: question.question_type,
                    options: question.options,
                    correctAnswer: question.correct_answer,
                    mediaUrl: question.media_url
                });
            }
        });
        
        // اختيار عدد عشوائي من الأسئلة
        const questionsCount = Math.min(settings.questionsCount, flattenedQuestions.length);
        questions = getRandomQuestions(flattenedQuestions, questionsCount);
        
        // تهيئة الإجابات
        studentAnswers = new Array(questions.length).fill(null);
        
    } catch (error) {
        console.error('Error loading questions for test:', error);
        alert('حدث خطأ في تحميل الأسئلة');
        showLoginInterface();
    }
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
                    `<img src="${question.mediaUrl}" alt="مرفق السؤال" onerror="this.style.display='none'">`
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

async function submitTest() {
    clearInterval(timerInterval);
    
    const endTime = new Date();
    const timeTaken = document.getElementById('timer').textContent;
    
    // حساب النتيجة
    const score = calculateScore();
    const percentage = Math.round((score / questions.length) * 100);
    
    // حفظ نتيجة الطالب
    const studentName = localStorage.getItem('currentStudent');
    
    try {
        await insertData('student_results', {
            student_name: studentName,
            score: score,
            total_questions: questions.length,
            percentage: percentage,
            time_taken: timeTaken,
            answers: studentAnswers
        });
        
        // عرض النتائج
        showResults(score, percentage, timeTaken);
        
    } catch (error) {
        console.error('Error saving student result:', error);
        alert('حدث خطأ في حفظ النتيجة، لكن يمكنك عرض النتائج الآن');
        showResults(score, percentage, timeTaken);
    }
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
                    const studentAnswerText = studentAnswer ? question.options[studentAnswer - 1] : 'لم تجب';
                    const correctAnswerText = question.options[question.correctAnswer - 1];
                    
                    return `
                        <div class="question-feedback">
                            <h4>السؤال ${index + 1}</h4>
                            ${question.readingPassage ? `
                                <div class="reading-passage">
                                    <strong>قطعة الاستيعاب:</strong>
                                    <div class="passage-content">${question.readingPassage}</div>
                                </div>
                            ` : ''}
                            <p><strong>النص:</strong> ${question.text}</p>
                            <p><strong>إجابتك:</strong> ${studentAnswerText}</p>
                            <p><strong>الإجابة الصحيحة:</strong> ${correctAnswerText}</p>
                            <p class="${isCorrect ? 'correct-text' : 'incorrect-text'}">
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
    return url && (url.includes('youtube.com') || url.includes('youtu.be'));
}

function getYouTubeEmbedUrl(url) {
    if (!url) return '';
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : url;
}
