// إدارة الأسئلة والإعدادات للمسؤول

let questions = JSON.parse(localStorage.getItem('questions')) || [];
let authorizedStudents = JSON.parse(localStorage.getItem('authorizedStudents')) || [];
let settings = JSON.parse(localStorage.getItem('settings')) || {
    questionsCount: 10,
    loginType: 'open',
    attemptsCount: 1,
    resultsDisplay: 'show-answers'
};

let readingQuestions = [];

function initAdmin() {
    loadQuestions();
    loadReports();
    loadSettings();
    loadAuthorizedStudents();
    setupEventListeners();
}

function setupEventListeners() {
    // تبديل التبويبات
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // تغيير نوع السؤال
    document.getElementById('question-type').addEventListener('change', function() {
        const type = this.value;
        handleQuestionTypeChange(type);
    });

    // تغيير عدد الخيارات
    document.getElementById('options-count').addEventListener('change', updateOptionsContainer);

    // إضافة سؤال استيعاب مقروء
    document.getElementById('add-reading-question').addEventListener('click', addReadingQuestion);

    // إضافة سؤال جديد
    document.getElementById('add-question-form').addEventListener('submit', addQuestion);

    // حفظ الإعدادات
    document.getElementById('save-settings').addEventListener('click', saveSettings);

    // تغيير نوع الدخول
    document.getElementById('login-type').addEventListener('change', function() {
        const attemptsGroup = document.getElementById('attempts-count-group');
        const authorizedSection = document.getElementById('authorized-students-section');
        const isRestricted = this.value === 'restricted';
        
        attemptsGroup.style.display = isRestricted ? 'block' : 'none';
        authorizedSection.style.display = isRestricted ? 'block' : 'none';
    });

    // إضافة طالب مصرح له
    document.getElementById('add-authorized-student').addEventListener('click', addAuthorizedStudent);

    // أحداث التقارير
    document.getElementById('show-top-students').addEventListener('click', showTopStudents);
    document.getElementById('delete-all-students').addEventListener('click', deleteAllStudents);
    document.getElementById('delete-selected-students').addEventListener('click', deleteSelectedStudents);
    document.getElementById('select-all-students').addEventListener('change', toggleSelectAllStudents);
    document.getElementById('print-report').addEventListener('click', printReport);
    document.getElementById('print-authorized-students').addEventListener('click', printAuthorizedStudents);
}

function handleQuestionTypeChange(type) {
    const mediaGroup = document.getElementById('media-url-group');
    const readingGroup = document.getElementById('reading-passage-group');
    const readingQuestionsContainer = document.getElementById('reading-questions-container');
    const standardOptionsSection = document.getElementById('standard-options-section');
    const standardQuestionGroup = document.getElementById('standard-question-group');
    
    // إظهار/إخفاء العناصر حسب نوع السؤال
    mediaGroup.style.display = type === 'multiple-with-media' ? 'block' : 'none';
    readingGroup.style.display = type === 'reading-comprehension' ? 'block' : 'none';
    readingQuestionsContainer.style.display = type === 'reading-comprehension' ? 'block' : 'none';
    standardOptionsSection.style.display = type === 'reading-comprehension' ? 'none' : 'block';
    standardQuestionGroup.style.display = type === 'reading-comprehension' ? 'none' : 'block';
    
    // إدارة السمات required بناءً على الحقول المرئية
    updateRequiredAttributes(type);
    
    if (type === 'reading-comprehension') {
        readingQuestions = [];
        loadReadingQuestions();
    } else {
        updateOptionsContainer();
    }
}

// دالة جديدة لإدارة السمات required
function updateRequiredAttributes(questionType) {
    const questionText = document.getElementById('question-text');
    const readingPassage = document.getElementById('reading-passage');
    
    if (questionType === 'reading-comprehension') {
        // إزالة required من حقول الأسئلة العادية
        questionText.required = false;
        readingPassage.required = true;
        
        // إزالة required من الخيارات العادية
        document.querySelectorAll('.option-input').forEach(input => {
            input.required = false;
        });
        document.querySelectorAll('input[name="correct-answer"]').forEach(radio => {
            radio.required = false;
        });
    } else {
        // إعادة required للحقول المرئية
        questionText.required = true;
        readingPassage.required = false;
        
        // إضافة required للخيارات المرئية
        updateOptionsRequiredAttributes();
    }
}

// دالة جديدة لتحديث السمات required للخيارات
function updateOptionsRequiredAttributes() {
    const optionInputs = document.querySelectorAll('.option-input');
    const correctAnswerRadios = document.querySelectorAll('input[name="correct-answer"]');
    
    optionInputs.forEach(input => {
        input.required = true;
    });
    
    correctAnswerRadios.forEach(radio => {
        radio.required = true;
    });
}

function switchTab(tabId) {
    // إخفاء جميع المحتويات
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // إلغاء تنشيط جميع الأزرار
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // إظهار المحتوى المحدد
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
}

function updateOptionsContainer() {
    const optionsCount = parseInt(document.getElementById('options-count').value);
    const container = document.getElementById('options-container');
    const correctAnswerContainer = document.getElementById('correct-answer-container');
    
    container.innerHTML = '';
    correctAnswerContainer.innerHTML = '';
    
    for (let i = 1; i <= optionsCount; i++) {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'form-group';
        optionDiv.innerHTML = `
            <label>الخيار ${i}</label>
            <input type="text" class="option-input" data-option="${i}" placeholder="أدخل نص الخيار ${i}" required>
        `;
        container.appendChild(optionDiv);
        
        const radioDiv = document.createElement('div');
        radioDiv.className = 'option-item';
        radioDiv.innerHTML = `
            <input type="radio" name="correct-answer" id="correct-${i}" value="${i}" required>
            <label for="correct-${i}">الخيار ${i}</label>
        `;
        correctAnswerContainer.appendChild(radioDiv);
    }
    
    // تحديث السمات required بناءً على نوع السؤال الحالي
    const currentType = document.getElementById('question-type').value;
    updateRequiredAttributes(currentType);
}

function addReadingQuestion() {
    const questionId = 'rq_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const questionDiv = document.createElement('div');
    questionDiv.className = 'reading-question-container';
    questionDiv.setAttribute('data-id', questionId);
    questionDiv.innerHTML = `
        <div class="reading-question-header">
            <h4>سؤال جديد للقطعة</h4>
            <button type="button" class="btn-danger btn-small" onclick="removeReadingQuestion('${questionId}')">حذف</button>
        </div>
        <div class="form-group">
            <label>نص السؤال</label>
            <textarea class="reading-question-text" placeholder="أدخل نص السؤال..."></textarea>
        </div>
        <div class="form-group">
            <label>عدد الخيارات</label>
            <select class="reading-options-count">
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4" selected>4</option>
                <option value="5">5</option>
                <option value="6">6</option>
            </select>
        </div>
        <div class="reading-options-container"></div>
        <div class="form-group">
            <label>الإجابة الصحيحة</label>
            <div class="reading-correct-answer-container"></div>
        </div>
        <hr>
    `;
    
    document.getElementById('reading-questions-list').appendChild(questionDiv);
    
    // تحديث الخيارات لهذا السؤال
    const optionsCountSelect = questionDiv.querySelector('.reading-options-count');
    optionsCountSelect.addEventListener('change', function() {
        updateReadingQuestionOptions(questionId);
    });
    
    updateReadingQuestionOptions(questionId);
}

function updateReadingQuestionOptions(questionId) {
    const questionDiv = document.querySelector(`.reading-question-container[data-id="${questionId}"]`);
    if (!questionDiv) return;
    
    const optionsCount = parseInt(questionDiv.querySelector('.reading-options-count').value);
    const optionsContainer = questionDiv.querySelector('.reading-options-container');
    const correctAnswerContainer = questionDiv.querySelector('.reading-correct-answer-container');
    
    optionsContainer.innerHTML = '';
    correctAnswerContainer.innerHTML = '';
    
    for (let i = 1; i <= optionsCount; i++) {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'form-group';
        optionDiv.innerHTML = `
            <label>الخيار ${i}</label>
            <input type="text" class="reading-option-input" data-option="${i}" placeholder="أدخل نص الخيار ${i}">
        `;
        optionsContainer.appendChild(optionDiv);
        
        const radioDiv = document.createElement('div');
        radioDiv.className = 'option-item';
        radioDiv.innerHTML = `
            <input type="radio" name="reading-correct-${questionId}" id="reading-correct-${questionId}-${i}" value="${i}">
            <label for="reading-correct-${questionId}-${i}">الخيار ${i}</label>
        `;
        correctAnswerContainer.appendChild(radioDiv);
    }
}

function removeReadingQuestion(questionId) {
    const questionDiv = document.querySelector(`.reading-question-container[data-id="${questionId}"]`);
    if (questionDiv) {
        questionDiv.remove();
    }
}

function loadReadingQuestions() {
    document.getElementById('reading-questions-list').innerHTML = '';
    readingQuestions = [];
}

// دالة جديدة للتحقق من صحة النموذج
function validateQuestionForm() {
    const questionType = document.getElementById('question-type').value;
    
    if (questionType === 'reading-comprehension') {
        const readingPassage = document.getElementById('reading-passage').value.trim();
        if (!readingPassage) {
            alert('يرجى إدخال قطعة الاستيعاب');
            return false;
        }
        
        const readingQuestionElements = document.querySelectorAll('.reading-question-container');
        if (readingQuestionElements.length === 0) {
            alert('يرجى إضافة أسئلة للقطعة');
            return false;
        }
    } else {
        const questionText = document.getElementById('question-text').value.trim();
        if (!questionText) {
            alert('يرجى إدخال نص السؤال');
            return false;
        }
        
        const correctAnswer = document.querySelector('input[name="correct-answer"]:checked');
        if (!correctAnswer) {
            alert('يرجى اختيار الإجابة الصحيحة');
            return false;
        }
        
        const optionInputs = document.querySelectorAll('.option-input');
        for (let input of optionInputs) {
            if (!input.value.trim()) {
                alert('يرجى إدخال جميع الخيارات');
                return false;
            }
        }
    }
    
    return true;
}

function addQuestion(e) {
    e.preventDefault();
    
    // التحقق اليدوي من الصحة بدلاً من الاعتماد على المتصفح
    if (!validateQuestionForm()) {
        return;
    }
    
    const questionType = document.getElementById('question-type').value;
    
    let question;
    
    if (questionType === 'reading-comprehension') {
        // معالجة أسئلة الاستيعاب المقروء
        const readingPassage = document.getElementById('reading-passage').value.trim();
        
        if (!readingPassage) {
            alert('يرجى إدخال قطعة الاستيعاب');
            return;
        }
        
        // جمع أسئلة القطعة
        const readingQuestionElements = document.querySelectorAll('.reading-question-container');
        if (readingQuestionElements.length === 0) {
            alert('يرجى إضافة أسئلة للقطعة');
            return;
        }
        
        const passageQuestions = [];
        let hasError = false;
        
        // التحقق من جميع الأسئلة أولاً
        for (let i = 0; i < readingQuestionElements.length; i++) {
            const questionDiv = readingQuestionElements[i];
            const questionId = questionDiv.getAttribute('data-id');
            const questionText = questionDiv.querySelector('.reading-question-text').value.trim();
            const optionsCount = parseInt(questionDiv.querySelector('.reading-options-count').value);
            const correctAnswer = questionDiv.querySelector(`input[name="reading-correct-${questionId}"]:checked`);
            
            // التحقق من نص السؤال
            if (!questionText) {
                alert(`يرجى إدخال نص السؤال رقم ${i + 1}`);
                hasError = true;
                break;
            }
            
            // التحقق من الإجابة الصحيحة
            if (!correctAnswer) {
                alert(`يرجى اختيار الإجابة الصحيحة للسؤال رقم ${i + 1}`);
                hasError = true;
                break;
            }
            
            // جمع الخيارات والتحقق منها
            const options = [];
            for (let j = 1; j <= optionsCount; j++) {
                const optionInput = questionDiv.querySelector(`.reading-option-input[data-option="${j}"]`);
                if (!optionInput || !optionInput.value.trim()) {
                    alert(`يرجى إدخال نص الخيار ${j} للسؤال رقم ${i + 1}`);
                    hasError = true;
                    break;
                }
                options.push(optionInput.value);
            }
            
            if (hasError) break;
            
            // إضافة السؤال إلى القائمة
            passageQuestions.push({
                id: questionId,
                text: questionText,
                options: options,
                correctAnswer: parseInt(correctAnswer.value)
            });
        }
        
        if (hasError) return;
        
        question = {
            id: Date.now(),
            text: "قطعة استيعاب مقروء",
            type: questionType,
            readingPassage: readingPassage,
            passageQuestions: passageQuestions
        };
        
    } else {
        // الأسئلة العادية
        const questionText = document.getElementById('question-text').value.trim();
        const optionsCount = parseInt(document.getElementById('options-count').value);
        const correctAnswer = document.querySelector('input[name="correct-answer"]:checked');
        
        if (!questionText) {
            alert('يرجى إدخال نص السؤال');
            return;
        }
        
        if (!correctAnswer) {
            alert('يرجى اختيار الإجابة الصحيحة');
            return;
        }
        
        const options = [];
        for (let i = 1; i <= optionsCount; i++) {
            const optionInput = document.querySelector(`.option-input[data-option="${i}"]`);
            if (!optionInput || !optionInput.value.trim()) {
                alert(`يرجى إدخال نص الخيار ${i}`);
                return;
            }
            options.push(optionInput.value);
        }
        
        question = {
            id: Date.now(),
            text: questionText,
            type: questionType,
            options: options,
            correctAnswer: parseInt(correctAnswer.value),
            mediaUrl: questionType === 'multiple-with-media' ? document.getElementById('media-url').value : null
        };
    }
    
    questions.push(question);
    saveQuestions();
    loadQuestions();
    
    // إعادة تعيين النموذج
    resetQuestionForm();
    
    alert('تم إضافة السؤال بنجاح');
}

function resetQuestionForm() {
    document.getElementById('add-question-form').reset();
    document.getElementById('media-url-group').style.display = 'none';
    document.getElementById('reading-passage-group').style.display = 'none';
    document.getElementById('reading-questions-container').style.display = 'none';
    document.getElementById('standard-options-section').style.display = 'block';
    document.getElementById('standard-question-group').style.display = 'block';
    document.getElementById('question-type').value = 'multiple';
    updateOptionsContainer();
    document.getElementById('reading-questions-list').innerHTML = '';
    
    // تحديث السمات required
    updateRequiredAttributes('multiple');
}

function loadQuestions() {
    const container = document.getElementById('questions-list');
    container.innerHTML = '';
    
    if (questions.length === 0) {
        container.innerHTML = '<p>لا توجد أسئلة مضافة بعد</p>';
        return;
    }
    
    questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-container';
        
        let questionHTML = `
            <h4>السؤال ${index + 1} - ${getQuestionTypeText(question.type)}</h4>
        `;
        
        if (question.type === 'reading-comprehension') {
            questionHTML += `
                <div class="reading-passage">
                    <h5>قطعة الاستيعاب:</h5>
                    <div class="passage-content">${question.readingPassage}</div>
                </div>
                <p><strong>عدد الأسئلة:</strong> ${question.passageQuestions.length}</p>
                <div class="passage-questions">
            `;
            
            question.passageQuestions.forEach((q, qIndex) => {
                questionHTML += `
                    <div class="passage-question">
                        <strong>سؤال ${qIndex + 1}:</strong> ${q.text}
                        <br><strong>الخيارات:</strong>
                        <ul>
                `;
                
                q.options.forEach((option, optIndex) => {
                    const isCorrect = (optIndex + 1) === q.correctAnswer;
                    questionHTML += `
                        <li class="${isCorrect ? 'correct-answer' : ''}">
                            ${option} ${isCorrect ? '✓' : ''}
                        </li>
                    `;
                });
                
                questionHTML += `
                        </ul>
                    </div>
                `;
            });
            
            questionHTML += `</div>`;
        } else {
            questionHTML += `
                <p><strong>النص:</strong> ${question.text}</p>
                ${question.mediaUrl ? `<p><strong>المرفق:</strong> ${question.mediaUrl}</p>` : ''}
                <p><strong>الخيارات:</strong></p>
                <ul>
                    ${question.options.map((option, i) => `
                        <li class="${i + 1 === question.correctAnswer ? 'correct-answer' : ''}">
                            ${option} ${i + 1 === question.correctAnswer ? '✓' : ''}
                        </li>
                    `).join('')}
                </ul>
            `;
        }
        
        questionHTML += `
            <button class="btn-danger btn-small" onclick="deleteQuestion(${question.id})">حذف</button>
        `;
        
        questionDiv.innerHTML = questionHTML;
        container.appendChild(questionDiv);
    });
}

function getQuestionTypeText(type) {
    const types = {
        'multiple': 'اختيار من متعدد',
        'multiple-with-media': 'اختيار من متعدد مع مرفق',
        'reading-comprehension': 'استيعاب المقروء'
    };
    return types[type] || type;
}

function deleteQuestion(id) {
    if (confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
        questions = questions.filter(q => q.id !== id);
        saveQuestions();
        loadQuestions();
    }
}

function saveQuestions() {
    localStorage.setItem('questions', JSON.stringify(questions));
}

// باقي الدوال بدون تغيير
function loadReports() {
    const students = JSON.parse(localStorage.getItem('students')) || [];
    const tbody = document.querySelector('#students-report tbody');
    
    tbody.innerHTML = '';
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">لا توجد بيانات للطلاب</td></tr>';
        document.getElementById('overall-percentage').textContent = '0%';
        return;
    }
    
    let totalPercentage = 0;
    
    students.forEach((student, index) => {
        totalPercentage += student.percentage;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="student-checkbox" data-index="${index}"></td>
            <td>${student.name}</td>
            <td>${student.percentage}%</td>
            <td>${student.timeTaken}</td>
            <td>${student.date}</td>
        `;
        tbody.appendChild(tr);
    });
    
    const overallPercentage = (totalPercentage / students.length).toFixed(1);
    document.getElementById('overall-percentage').textContent = `${overallPercentage}%`;
}

function showTopStudents() {
    const count = parseInt(document.getElementById('top-students-count').value);
    const students = JSON.parse(localStorage.getItem('students')) || [];
    
    const topStudents = students
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, count);
    
    const tbody = document.querySelector('#students-report tbody');
    tbody.innerHTML = '';
    
    topStudents.forEach((student, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="student-checkbox" data-index="${index}"></td>
            <td>${student.name}</td>
            <td>${student.percentage}%</td>
            <td>${student.timeTaken}</td>
            <td>${student.date}</td>
        `;
        tbody.appendChild(tr);
    });
}

function toggleSelectAllStudents() {
    const selectAll = document.getElementById('select-all-students').checked;
    document.querySelectorAll('.student-checkbox').forEach(checkbox => {
        checkbox.checked = selectAll;
    });
}

function deleteSelectedStudents() {
    const checkboxes = document.querySelectorAll('.student-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('يرجى اختيار طلاب للحذف');
        return;
    }
    
    if (confirm(`هل أنت متأكد من حذف ${checkboxes.length} طالب؟`)) {
        const students = JSON.parse(localStorage.getItem('students')) || [];
        const indicesToDelete = Array.from(checkboxes).map(cb => parseInt(cb.getAttribute('data-index')));
        
        const updatedStudents = students.filter((_, index) => !indicesToDelete.includes(index));
        localStorage.setItem('students', JSON.stringify(updatedStudents));
        
        loadReports();
        alert('تم حذف الطلاب المحددين بنجاح');
    }
}

function deleteAllStudents() {
    if (confirm('هل أنت متأكد من حذف جميع الطلاب ونتائجهم؟')) {
        localStorage.removeItem('students');
        loadReports();
        alert('تم حذف جميع الطلاب بنجاح');
    }
}

function printReport() {
    window.print();
}

function loadSettings() {
    document.getElementById('questions-count').value = settings.questionsCount;
    document.getElementById('login-type').value = settings.loginType;
    document.getElementById('attempts-count').value = settings.attemptsCount;
    document.getElementById('results-display').value = settings.resultsDisplay;
    
    // تحديث عرض العناصر بناءً على نوع الدخول
    const attemptsGroup = document.getElementById('attempts-count-group');
    const authorizedSection = document.getElementById('authorized-students-section');
    const isRestricted = settings.loginType === 'restricted';
    
    attemptsGroup.style.display = isRestricted ? 'block' : 'none';
    authorizedSection.style.display = isRestricted ? 'block' : 'none';
}

function saveSettings() {
    settings = {
        questionsCount: parseInt(document.getElementById('questions-count').value),
        loginType: document.getElementById('login-type').value,
        attemptsCount: parseInt(document.getElementById('attempts-count').value),
        resultsDisplay: document.getElementById('results-display').value
    };
    
    localStorage.setItem('settings', JSON.stringify(settings));
    alert('تم حفظ الإعدادات بنجاح');
}

function loadAuthorizedStudents() {
    const tbody = document.querySelector('#authorized-students-list tbody');
    tbody.innerHTML = '';
    
    authorizedStudents.forEach((student, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${student.id}</td>
            <td>${student.name}</td>
            <td>${student.usedAttempts || 0}</td>
            <td>
                <button class="btn-danger btn-small" onclick="deleteAuthorizedStudent(${index})">حذف</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function addAuthorizedStudent() {
    const studentId = document.getElementById('student-id').value.trim();
    const studentName = document.getElementById('student-name').value.trim();
    
    if (!studentId || !studentName) {
        alert('يرجى إدخال جميع البيانات');
        return;
    }
    
    // التحقق من عدم تكرار رقم الهوية
    if (authorizedStudents.some(s => s.id === studentId)) {
        alert('رقم الهوية/الإقامة مسجل مسبقاً');
        return;
    }
    
    authorizedStudents.push({
        id: studentId,
        name: studentName,
        usedAttempts: 0
    });
    
    saveAuthorizedStudents();
    loadAuthorizedStudents();
    
    // إعادة تعيين الحقول
    document.getElementById('student-id').value = '';
    document.getElementById('student-name').value = '';
    
    alert('تم إضافة الطالب بنجاح');
}

function deleteAuthorizedStudent(index) {
    if (confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
        authorizedStudents.splice(index, 1);
        saveAuthorizedStudents();
        loadAuthorizedStudents();
    }
}

function saveAuthorizedStudents() {
    localStorage.setItem('authorizedStudents', JSON.stringify(authorizedStudents));
}

function printAuthorizedStudents() {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html dir="rtl">
        <head>
            <title>قائمة الطلاب المصرح لهم</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                th { background-color: #f2f2f2; }
                h1 { text-align: center; }
            </style>
        </head>
        <body>
            <h1>قائمة الطلاب المصرح لهم بالدخول</h1>
            ${document.getElementById('authorized-students-list').outerHTML}
        </body>
        </html>
    `);
    printWindow.print();
}

// تحديث الحاوية عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    updateOptionsContainer();
});
