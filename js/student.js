// واجهة الطالب والاختبارات مع Supabase

let currentQuestionIndex = 0;
let studentAnswers = [];
let startTime;
let timerInterval;
let questions = [];
let settings = {};

async function initStudent() {
    console.log('بدء تهيئة واجهة الطالب...');
    await loadSettings();
    setupEventListeners();
}

function setupEventListeners() {
    console.log('إعداد مستمعي الأحداث...');
}

async function loadSettings() {
    try {
        console.log('جاري تحميل الإعدادات...');
        const { data, error } = await window.supabase.rpc('get_settings');
        
        if (error) {
            console.error('خطأ في تحميل الإعدادات:', error);
            throw error;
        }
        
        settings = data || {
            questionsCount: 10,
            loginType: 'open',
            attemptsCount: 1,
            resultsDisplay: 'show-answers'
        };
        
        console.log('الإعدادات المحملة:', settings);
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
    console.log('عرض واجهة الدخول...');
    const openLogin = document.getElementById('open-login');
    const restrictedLogin = document.getElementById('restricted-login');
    const testContainer = document.getElementById('test-container');
    const resultsContainer = document.getElementById('results-container');
    
    if (openLogin) openLogin.style.display = settings.loginType === 'open' ? 'block' : 'none';
    if (restrictedLogin) restrictedLogin.style.display = settings.loginType === 'restricted' ? 'block' : 'none';
    if (testContainer) testContainer.style.display = 'none';
    if (resultsContainer) resultsContainer.style.display = 'none';
}

async function validateRestrictedLogin() {
    const studentId = document.getElementById('student-id-input').value.trim();
    const studentName = document.getElementById('student-name-input').value.trim();
    
    if (!studentId || !studentName) {
        alert('يرجى إدخال جميع البيانات');
        return;
    }
    
    try {
        console.log('التحقق من بيانات الطالب...');
        const { data, error } = await window.supabase
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
            await window.supabase
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

async function startTest(studentName) {
    console.log('بدء الاختبار للطالب:', studentName);
    
    // إخفاء واجهات الدخول
    document.getElementById('open-login').style.display = 'none';
    document.getElementById('restricted-login').style.display = 'none';
    
    // إظهار واجهة الاختبار
    document.getElementById('test-container').style.display = 'block';
    
    // تحميل الأسئلة
    await loadQuestionsForTest();
    
    // عرض السؤال الأول
    displayCurrentQuestion();
    
    // بدء المؤقت
    startTime = new Date();
    startTimer();
    
    // حفظ اسم الطالب
    localStorage.setItem('currentStudent', studentName);
    
    console.log('الاختبار بدأ بنجاح');
}

async function loadQuestionsForTest() {
    try {
        console.log('جاري تحميل الأسئلة...');
        const allQuestions = await window.supabaseFetchData('questions');
        
        console.log('عدد الأسئلة المحملة من قاعدة البيانات:', allQuestions.length);
        
        if (allQuestions.length === 0) {
            alert('لا توجد أسئلة متاحة للاختبار');
            showLoginInterface();
            return;
        }
        
        // تحويل أسئلة الاستيعاب إلى أسئلة فردية
        const flattenedQuestions = [];
        allQuestions.forEach(question => {
            if (question.question_type === 'reading-comprehension' && question.passage_questions) {
                // إضافة كل سؤال من أسئلة القطعة كسؤال منفصل
                question.passage_questions.forEach((passageQ, qIndex) => {
                    flattenedQuestions.push({
                        id: `${question.id}_${qIndex}`,
                        text: passageQ.text,
                        type: 'reading-comprehension-item',
                        options: passageQ.options,
                        correctAnswer: passageQ.correctAnswer,
                        readingPassage: question.reading_passage,
                        parentQuestionId: question.id
                    });
                });
            } else {
                // الأسئلة العادية
                flattenedQuestions.push({
                    id: question.id,
                    text: question.question_text,
                    type: question.question_type,
                    options: question.options || [],
                    correctAnswer: question.correct_answer,
                    mediaUrl: question.media_url
                });
            }
        });
        
        console.log('الأسئلة بعد التحويل:', flattenedQuestions.length);
        
        // اختيار عدد عشوائي من الأسئلة
        const questionsCount = Math.min(settings.questionsCount || 10, flattenedQuestions.length);
        questions = getRandomQuestions(flattenedQuestions, questionsCount);
        
        console.log('الأسئلة المختارة للاختبار:', questions.length);
        
        // تهيئة الإجابات
        studentAnswers = new Array(questions.length).fill(null);
        
    } catch (error) {
        console.error('Error loading questions for test:', error);
        alert('حدث خطأ في تحميل الأسئلة');
        showLoginInterface();
    }
}

function getRandomQuestions(allQuestions, count) {
    // نسخ المصفوفة وخلطها عشوائياً
    const shuffled = [...allQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}

function displayCurrentQuestion() {
    const container = document.getElementById('questions-container');
    
    if (!container) {
        console.error('عنصر questions-container غير موجود');
        return;
    }
    
    if (questions.length === 0) {
        container.innerHTML = '<p>لا توجد أسئلة متاحة</p>';
        return;
    }
    
    const question = questions[currentQuestionIndex];
    
    console.log('عرض السؤال:', currentQuestionIndex + 1, question);
    
    container.innerHTML = '';
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-container';
    
    let questionHTML = `
        <div class="question-header">
            <h3>السؤال ${currentQuestionIndex + 1} من ${questions.length}</h3>
        </div>
    `;
    
    // إضافة قطعة الاستيعاب إذا كان السؤال من نوع استيعاب مقروء
    if (question.type === 'reading-comprehension-item' && question.readingPassage) {
        questionHTML += `
            <div class="reading-passage">
                <h4>اقرأ القطعة التالية ثم أجب عن السؤال:</h4>
                <div class="passage-content" style="max-width: 100%; overflow-wrap: break-word; word-break: break-word; box-sizing: border-box;">
                    ${question.readingPassage}
                </div>
            </div>
        `;
    }
    
    questionHTML += `
        <div class="question-content">
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
    
    // إضافة الخيارات
    if (question.options && question.options.length > 0) {
        questionHTML += `
            <div class="options-container">
                ${question.options.map((option, index) => `
                    <div class="option-item">
                        <input type="radio" name="answer" id="option-${currentQuestionIndex}-${index}" 
                               value="${index + 1}" 
                               ${studentAnswers[currentQuestionIndex] === index + 1 ? 'checked' : ''}>
                        <label for="option-${currentQuestionIndex}-${index}">${option}</label>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        questionHTML += `<p class="no-options">لا توجد خيارات متاحة لهذا السؤال</p>`;
    }
    
    questionHTML += `</div>`;
    
    questionDiv.innerHTML = questionHTML;
    container.appendChild(questionDiv);
    
    // تحديث عداد الأسئلة
    updateQuestionCounter();
    
    // تحديث أزرار التنقل
    updateNavigationButtons();
    
    // إضافة مستمعي الأحداث للخيارات
    if (question.options && question.options.length > 0) {
        question.options.forEach((_, index) => {
            const radioBtn = document.getElementById(`option-${currentQuestionIndex}-${index}`);
            if (radioBtn) {
                radioBtn.addEventListener('change', function() {
                    studentAnswers[currentQuestionIndex] = parseInt(this.value);
                    console.log('تم اختيار الإجابة:', studentAnswers[currentQuestionIndex]);
                });
            }
        });
    }
}

function updateQuestionCounter() {
    const counter = document.getElementById('question-counter');
    if (counter) {
        counter.textContent = `السؤال ${currentQuestionIndex + 1} من ${questions.length}`;
    }
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    
    if (prevBtn) {
        prevBtn.disabled = currentQuestionIndex === 0;
        prevBtn.style.display = currentQuestionIndex === 0 ? 'none' : 'block';
    }
    
    if (nextBtn && submitBtn) {
        const isLastQuestion = currentQuestionIndex === questions.length - 1;
        nextBtn.style.display = isLastQuestion ? 'none' : 'block';
        submitBtn.style.display = isLastQuestion ? 'block' : 'none';
        
        // التأكد من أن الأزرار مرئية
        nextBtn.style.visibility = 'visible';
        nextBtn.style.opacity = '1';
        submitBtn.style.visibility = 'visible';
        submitBtn.style.opacity = '1';
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayCurrentQuestion();
    }
}

function nextQuestion() {
    // حفظ الإجابة الحالية أولاً
    const currentAnswer = document.querySelector('input[name="answer"]:checked');
    if (currentAnswer) {
        studentAnswers[currentQuestionIndex] = parseInt(currentAnswer.value);
    }
    
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        displayCurrentQuestion();
    } else {
        // إذا كان هذا آخر سؤال، إنهاء الاختبار
        submitTest();
    }
}

function startTimer() {
    clearInterval(timerInterval);
    updateTimer(); // تحديث فوري
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    if (!startTime) return;
    
    const currentTime = new Date();
    const elapsedTime = Math.floor((currentTime - startTime) / 1000);
    
    const hours = Math.floor(elapsedTime / 3600);
    const minutes = Math.floor((elapsedTime % 3600) / 60);
    const seconds = elapsedTime % 60;
    
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

async function submitTest() {
    // إيقاف المؤقت
    clearInterval(timerInterval);
    
    // التأكد من حفظ الإجابة الأخيرة
    const currentAnswer = document.querySelector('input[name="answer"]:checked');
    if (currentAnswer) {
        studentAnswers[currentQuestionIndex] = parseInt(currentAnswer.value);
    }
    
    const endTime = new Date();
    const timeTaken = document.getElementById('timer').textContent;
    
    // حساب النتيجة
    const score = calculateScore();
    const percentage = Math.round((score / questions.length) * 100);
    
    console.log('النتيجة:', { score, percentage, timeTaken, answers: studentAnswers });
    
    // حفظ نتيجة الطالب
    const studentName = localStorage.getItem('currentStudent');
    
    try {
        const result = await window.supabaseInsertData('student_results', {
            student_name: studentName,
            score: score,
            total_questions: questions.length,
            percentage: percentage,
            time_taken: timeTaken,
            answers: studentAnswers
        });
        
        if (result) {
            console.log('تم حفظ النتيجة بنجاح:', result);
        }
        
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
    if (!container) {
        console.error('عنصر results-container غير موجود');
        return;
    }
    
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
                    const studentAnswerText = studentAnswer && question.options ? question.options[studentAnswer - 1] : 'لم تجب';
                    const correctAnswerText = question.options ? question.options[question.correctAnswer - 1] : 'غير متوفر';
                    
                    return `
                        <div class="question-feedback">
                            <h4>السؤال ${index + 1}</h4>
                            ${question.readingPassage ? `
                                <div class="reading-passage">
                                    <strong>قطعة الاستيعاب:</strong>
                                    <div class="passage-content" style="max-width: 100%; overflow-wrap: break-word; word-break: break-word; box-sizing: border-box;">
                                        ${question.readingPassage}
                                    </div>
                                </div>
                            ` : ''}
                            <p><strong>السؤال:</strong> ${question.text}</p>
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

// جعل الدوال متاحة globally للاستدعاء من HTML
window.validateRestrictedLogin = validateRestrictedLogin;
window.startTest = startTest;
window.previousQuestion = previousQuestion;
window.nextQuestion = nextQuestion;
window.submitTest = submitTest;
