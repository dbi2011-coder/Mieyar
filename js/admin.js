// إدارة الأسئلة والإعدادات للمسؤول مع Supabase

let questions = [];
let authorizedStudents = [];
let settings = {};
let readingQuestions = [];

async function initAdmin() {
    await loadQuestions();
    await loadReports();
    await loadSettings();
    await loadAuthorizedStudents();
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
    
    mediaGroup.style.display = type === 'multiple-with-media' ? 'block' : 'none';
    readingGroup.style.display = type === 'reading-comprehension' ? 'block' : 'none';
    readingQuestionsContainer.style.display = type === 'reading-comprehension' ? 'block' : 'none';
    standardOptionsSection.style.display = type === 'reading-comprehension' ? 'none' : 'block';
    standardQuestionGroup.style.display = type === 'reading-comprehension' ? 'none' : 'block';
    
    updateRequiredAttributes(type);
    
    if (type === 'reading-comprehension') {
        readingQuestions = [];
        loadReadingQuestions();
    } else {
        updateOptionsContainer();
    }
}

function updateRequiredAttributes(questionType) {
    const questionText = document.getElementById('question-text');
    const readingPassage = document.getElementById('reading-passage');
    
    if (questionType === 'reading-comprehension') {
        questionText.required = false;
        readingPassage.required = true;
        
        document.querySelectorAll('.option-input').forEach(input => {
            input.required = false;
        });
        document.querySelectorAll('input[name="correct-answer"]').forEach(radio => {
            radio.required = false;
        });
    } else {
        questionText.required = true;
        readingPassage.required = false;
        updateOptionsRequiredAttributes();
    }
}

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
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
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

async function addQuestion(e) {
    e.preventDefault();
    
    if (!validateQuestionForm()) {
        return;
    }
    
    const questionType = document.getElementById('question-type').value;
    
    let question;
    
    if (questionType === 'reading-comprehension') {
        const readingPassage = document.getElementById('reading-passage').value.trim();
        
        if (!readingPassage) {
            alert('يرجى إدخال قطعة الاستيعاب');
            return;
        }
        
        const readingQuestionElements = document.querySelectorAll('.reading-question-container');
        if (readingQuestionElements.length === 0) {
            alert('يرجى إضافة أسئلة للقطعة');
            return;
        }
        
        const passageQuestions = [];
        let hasError = false;
        
        for (let i = 0; i < readingQuestionElements.length; i++) {
            const questionDiv = readingQuestionElements[i];
            const questionId = questionDiv.getAttribute('data-id');
            const questionText = questionDiv.querySelector('.reading-question-text').value.trim();
            const optionsCount = parseInt(questionDiv.querySelector('.reading-options-count').value);
            const correctAnswer = questionDiv.querySelector(`input[name="reading-correct-${questionId}"]:checked`);
            
            if (!questionText) {
                alert(`يرجى إدخال نص السؤال رقم ${i + 1}`);
                hasError = true;
                break;
            }
            
            if (!correctAnswer) {
                alert(`يرجى اختيار الإجابة الصحيحة للسؤال رقم ${i + 1}`);
                hasError = true;
                break;
            }
            
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
            
            passageQuestions.push({
                id: questionId,
                text: questionText,
                options: options,
                correctAnswer: parseInt(correctAnswer.value)
            });
        }
        
        if (hasError) return;
        
        question = {
            question_text: "قطعة استيعاب مقروء",
            question_type: questionType,
            reading_passage: readingPassage,
            passage_questions: passageQuestions
        };
        
    } else {
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
            question_text: questionText,
            question_type: questionType,
            options: options,
            correct_answer: parseInt(correctAnswer.value),
            media_url: questionType === 'multiple-with-media' ? document.getElementById('media-url').value : null
        };
    }
    
    try {
        const result = await window.supabaseInsertData('questions', question);
        if (result) {
            questions.push(result);
            await loadQuestions();
            resetQuestionForm();
            showAlert('تم إضافة السؤال بنجاح', 'success');
        }
    } catch (error) {
        console.error('Error adding question:', error);
        showAlert('خطأ في إضافة السؤال', 'error');
    }
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
    updateRequiredAttributes('multiple');
}

async function loadQuestions() {
    try {
        questions = await window.supabaseFetchData('questions', { orderBy: 'created_at' });
        renderQuestions();
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

function renderQuestions() {
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
            <h4>السؤال ${index + 1} - ${getQuestionTypeText(question.question_type)}</h4>
        `;
        
        if (question.question_type === 'reading-comprehension') {
            questionHTML += `
                <div class="reading-passage">
                    <h5>قطعة الاستيعاب:</h5>
                    <div class="passage-content">${question.reading_passage}</div>
                </div>
                <p><strong>عدد الأسئلة:</strong> ${question.passage_questions.length}</p>
                <div class="passage-questions">
            `;
            
            question.passage_questions.forEach((q, qIndex) => {
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
                <p><strong>النص:</strong> ${question.question_text}</p>
                ${question.media_url ? `<p><strong>المرفق:</strong> ${question.media_url}</p>` : ''}
                <p><strong>الخيارات:</strong></p>
                <ul>
                    ${question.options.map((option, i) => `
                        <li class="${i + 1 === question.correct_answer ? 'correct-answer' : ''}">
                            ${option} ${i + 1 === question.correct_answer ? '✓' : ''}
                        </li>
                    `).join('')}
                </ul>
            `;
        }
        
        questionHTML += `
            <button class="btn-danger btn-small" onclick="deleteQuestion('${question.id}')">حذف</button>
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

async function deleteQuestion(id) {
    if (confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
        const success = await window.supabaseDeleteData('questions', id);
        if (success) {
            questions = questions.filter(q => q.id !== id);
            renderQuestions();
            showAlert('تم حذف السؤال بنجاح', 'success');
        } else {
            showAlert('خطأ في حذف السؤال', 'error');
        }
    }
}

async function loadReports() {
    try {
        const students = await window.supabaseFetchData('student_results', { orderBy: 'test_date' });
        renderStudentReports(students);
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

function renderStudentReports(students) {
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
            <td><input type="checkbox" class="student-checkbox" data-id="${student.id}"></td>
            <td>${student.student_name}</td>
            <td>${student.percentage}%</td>
            <td>${student.time_taken}</td>
            <td>${new Date(student.test_date).toLocaleDateString('ar-SA')}</td>
        `;
        tbody.appendChild(tr);
    });
    
    const overallPercentage = (totalPercentage / students.length).toFixed(1);
    document.getElementById('overall-percentage').textContent = `${overallPercentage}%`;
}

async function showTopStudents() {
    const count = parseInt(document.getElementById('top-students-count').value);
    const students = await window.supabaseFetchData('student_results', { orderBy: 'test_date' });
    
    const topStudents = students
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, count);
    
    renderStudentReports(topStudents);
}

function toggleSelectAllStudents() {
    const selectAll = document.getElementById('select-all-students').checked;
    document.querySelectorAll('.student-checkbox').forEach(checkbox => {
        checkbox.checked = selectAll;
    });
}

async function deleteSelectedStudents() {
    const checkboxes = document.querySelectorAll('.student-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('يرجى اختيار طلاب للحذف');
        return;
    }
    
    if (confirm(`هل أنت متأكد من حذف ${checkboxes.length} طالب؟`)) {
        let successCount = 0;
        
        for (const checkbox of checkboxes) {
            const studentId = checkbox.getAttribute('data-id');
            const success = await window.supabaseDeleteData('student_results', studentId);
            if (success) successCount++;
        }
        
        await loadReports();
        showAlert(`تم حذف ${successCount} طالب بنجاح', 'success`);
    }
}

async function deleteAllStudents() {
    if (confirm('هل أنت متأكد من حذف جميع الطلاب ونتائجهم؟')) {
        const students = await window.supabaseFetchData('student_results');
        let successCount = 0;
        
        for (const student of students) {
            const success = await window.supabaseDeleteData('student_results', student.id);
            if (success) successCount++;
        }
        
        await loadReports();
        showAlert(`تم حذف ${successCount} طالب بنجاح', 'success`);
    }
}

function printReport() {
    window.print();
}

async function loadSettings() {
    try {
        console.log('📥 جاري تحميل الإعدادات...');
        
        const { data, error } = await supabase
            .from('settings')
            .select('setting_value')
            .eq('setting_key', 'test_settings')
            .single();

        if (error) {
            console.log('ℹ️ استخدام الإعدادات الافتراضية');
            settings = {
                questionsCount: 10,
                loginType: 'open',
                attemptsCount: 1,
                resultsDisplay: 'show-answers'
            };
        } else {
            console.log('✅ الإعدادات المحملة:', data.setting_value);
            settings = data.setting_value;
        }
        
        updateSettingsForm();
        
    } catch (error) {
        console.error('❌ خطأ:', error);
        settings = {
            questionsCount: 10,
            loginType: 'open',
            attemptsCount: 1,
            resultsDisplay: 'show-answers'
        };
        updateSettingsForm();
    }
}

function updateSettingsForm() {
    console.log('🔄 تحديث نموذج الإعدادات:', settings);
    
    if (!settings) {
        console.log('⚠️ الإعدادات غير محددة');
        return;
    }
    
    // تعبئة الحقول بالقيم الحالية
    document.getElementById('questions-count').value = settings.questionsCount || 10;
    document.getElementById('login-type').value = settings.loginType || 'open';
    document.getElementById('attempts-count').value = settings.attemptsCount || 1;
    document.getElementById('results-display').value = settings.resultsDisplay || 'show-answers';
    
    // إظهار/إخفاء العناصر بناءً على نوع الدخول
    const attemptsGroup = document.getElementById('attempts-count-group');
    const authorizedSection = document.getElementById('authorized-students-section');
    const isRestricted = (settings.loginType || 'open') === 'restricted';
    
    attemptsGroup.style.display = isRestricted ? 'block' : 'none';
    authorizedSection.style.display = isRestricted ? 'block' : 'none';
    
    console.log('✅ تم تحديث نموذج الإعدادات');
}

async function saveSettings() {
    settings = {
        questionsCount: parseInt(document.getElementById('questions-count').value),
        loginType: document.getElementById('login-type').value,
        attemptsCount: parseInt(document.getElementById('attempts-count').value),
        resultsDisplay: document.getElementById('results-display').value
    };
    
    console.log('💾 حفظ الإعدادات:', settings);
    
    try {
        const { error } = await supabase
            .from('settings')
            .update({ 
                setting_value: settings,
                updated_at: new Date().toISOString()
            })
            .eq('setting_key', 'test_settings');

        if (error) throw error;
        
        showAlert('تم حفظ الإعدادات بنجاح', 'success');
        
    } catch (error) {
        console.error('❌ خطأ:', error);
        showAlert('خطأ في حفظ الإعدادات', 'error');
    }
}

async function loadAuthorizedStudents() {
    try {
        authorizedStudents = await window.supabaseFetchData('authorized_students', { orderBy: 'created_at' });
        renderAuthorizedStudents();
    } catch (error) {
        console.error('Error loading authorized students:', error);
    }
}

function renderAuthorizedStudents() {
    const tbody = document.querySelector('#authorized-students-list tbody');
    tbody.innerHTML = '';
    
    authorizedStudents.forEach((student, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${student.student_id}</td>
            <td>${student.student_name}</td>
            <td>${student.used_attempts || 0}</td>
            <td>
                <button class="btn-danger btn-small" onclick="deleteAuthorizedStudent('${student.id}')">حذف</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function addAuthorizedStudent() {
    const studentId = document.getElementById('student-id').value.trim();
    const studentName = document.getElementById('student-name').value.trim();
    
    if (!studentId || !studentName) {
        alert('يرجى إدخال جميع البيانات');
        return;
    }
    
    try {
        const result = await window.supabaseInsertData('authorized_students', {
            student_id: studentId,
            student_name: studentName,
            used_attempts: 0,
            max_attempts: settings.attemptsCount || 1
        });
        
        if (result) {
            authorizedStudents.push(result);
            renderAuthorizedStudents();
            document.getElementById('student-id').value = '';
            document.getElementById('student-name').value = '';
            showAlert('تم إضافة الطالب بنجاح', 'success');
        }
    } catch (error) {
        console.error('Error adding authorized student:', error);
        showAlert('خطأ في إضافة الطالب', 'error');
    }
}

async function deleteAuthorizedStudent(id) {
    if (confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
        const success = await window.supabaseDeleteData('authorized_students', id);
        if (success) {
            authorizedStudents = authorizedStudents.filter(s => s.id !== id);
            renderAuthorizedStudents();
            showAlert('تم حذف الطالب بنجاح', 'success');
        } else {
            showAlert('خطأ في حذف الطالب', 'error');
        }
    }
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
