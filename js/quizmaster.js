/*
* This is a self-help application. The user may choose/opt to cheat, but that will defeat the purpose of using this tool.
*/

var QuizMaster = (function () {
	'use strict';

	var ml = {};
	var quizzes = [];
	var stats = [];
	var currentQuiz = null;
	var quizActive = false;
	var timer = {
		interval : null,
		ticks : 0
	};
	var reservedWords = [
		'_STATS_',
		'_QUIZZES_'
	];

	var shuffle = function (array) {
		// fisher-yates shuffle [ https://github.com/coolaj86/knuth-shuffle/blob/master/index.js ]
	    var currentIndex = array.length
			, temporaryValue
			, randomIndex
			;

	    // While there remain elements to shuffle...
	    while (0 !== currentIndex) {

			// Pick a remaining element...
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex -= 1;

			// And swap it with the current element.
			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
	    }

	    return array;
	};

	var padDigits = function (number, digits) {
		return Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number;
	};

	ml.isReserved = function (word) {
		for (var i = 0; i < reservedWords.length; i++) {
			if (reservedWords[i] === word) return true;
		}

		return false;
	};

	ml.quizIsActive = function () {
		return quizActive;
	};

	ml.setStat = function (quizName, data) {
		// retrieve stat reference, then apply changes
		for (var i = 0; i < stats.length; i++) {
			if (stats[i].quizName === quizName) {
				stats[i].data = data;
				break;
			}
		}

		// no reference found, add new stattracker
		stats.push({quizName: quizName, data: data});
	};

	ml.getStat = function (quizName) {
		// retrieve stat reference, then return data
		for (var i = 0; i < stats.length; i++) {
			if (stats[i].quizName === quizName) {
				return stats[i].data;
			}
		}
	};

	ml.saveStatsToStorage = function () {
		localStorage.setItem('_STATS_', JSON.stringify(stats));
	};

	ml.loadStatsFromStorage = function () {
		stats = localStorage.getItem('_STATS_');
	};

	ml.inQuizzesArray = function (name) {
		for (var i = 0; i < quizzes.length; i++) {
			if (quizzes[i].name === name) {
				return true; // Don't overwrite
			}
		}

		return false;
	};

	ml.addQuiz = function (file, onLoadCallback) {
		// Adds a new quiz object to the quizzes array for later serving.

		var r = new FileReader();
		r.onload = function (e) {
			var quiz = JSON.parse(e.target.result);

			// Check if there are no duplicates
			for (var i = 0; i < quizzes.length; i++) {
				if (quizzes[i].name === quiz.name) {
					return; // Don't overwrite
				}
			}

			quizzes.push(quiz);

			ml.saveQuizzesToStorage();

			if (typeof onLoadCallback !== 'undefined') {
				onLoadCallback();	
			}
		};
		r.readAsText(file);
	};

	ml.removeQuiz = function (i) {
		// Remove quiz from array

		quizzes.splice(i,1);
		ml.saveQuizzesToStorage();

		return quizzes.length;
	};

	ml.loadQuizzesFromStorage = function () {
		// Load quizzes from local storage array

		var raw = localStorage.getItem('_QUIZZES_');

		if (!raw) return;

		var qls = JSON.parse(raw);

		for (var i = 0; i < qls.length; i++) {
			if (!ml.inQuizzesArray(qls[i].name)) {
				quizzes.push(qls[i]);
			}
		}
	};

	ml.saveQuizzesToStorage = function () {
		// Save quizzes to local storage array

		localStorage.setItem('_QUIZZES_', JSON.stringify(quizzes));
	};

	ml.shuffleQuiz = function (index) {
		// First, let us shuffle the item order
		quizzes[index].items = shuffle(quizzes[index].items);

		// Then the order of choices
		for (var i = 0; i < quizzes[index].items.length; i++) {
			quizzes[index].items[i].choices = shuffle(quizzes[index].items[i].choices);
		}
	};

	ml.getQuizList = function () {
		var qList = [];

		for (var i = 0; i < quizzes.length; i++) {
			qList.push(quizzes[i].name);
		}

		return qList;
	};

	ml.prepareQuiz = function (index) {
		// Stringifies a quiz object, preparing it for output.
		if (quizActive) {
			ml.endQuiz();
			return;
		}

		if (quizzes.length === 0) {
			// no quizzes found, darn
			return;
		}

		ml.shuffleQuiz(index); // pre-shuffle quiz

		var quiz = quizzes[index];
		currentQuiz = quiz;
		var paper = '';
		paper += '<h2 id="quiz-title">' + quiz.name + '</h2>';
		paper += '<p id="quiz-description">' + quiz.description + '</p>';
		paper += '<p id="quiz-duration">Duration: ' + quiz.duration + ' minutes</p>';
		paper += '<p id="quiz-instruction"><strong>Instructions:</strong> ' + quiz.instruction + '</p><br>';

		// quiz item section
		paper += '<table id="quiz-items">';

		// loop through all the quiz items
		for (var i = 0; i < quiz.items.length; i++) {
			paper += '<tr class="quiz-item">';
			paper += '<th style="vertical-align: top">' + (i+1) + '.</th><th style="padding-left: 12px; text-align: left;">' + quiz.items[i].question + '</th></tr><tr><th></th><td style="padding-left: 12px;">';

			var inputType = quiz.items[i].answers > 1 ? 'checkbox' : 'radio';

			for (var n = 0; n < quiz.items[i].choices.length; n++) {
				paper += '<table class="quiz-choice"><tr><td style="vertical-align: top"><input type="' + inputType + '" name="' + 'choice-group-' + i + '" value="' + quiz.items[i].choices[n].correct + '" onclick="if ($(\'input[name=choice-group-' + i + ']:checked\').size() === ' + quiz.items[i].answers + ' && ' + quiz.items[i].answers + ' > 1) { $(\'input[name=choice-group-' + i + ']:not(:checked)\').prop(\'disabled\', true); } else { $(\'input[name=choice-group-' + i + ']:not(:checked)\').prop(\'disabled\', false); }"></td><td class="quiz-choice-text" onclick="$(this).closest(\'.quiz-choice\').children().children().children().first().children().trigger(\'click\')">' + quiz.items[i].choices[n].text + '</td><tr></table>';
			}
			paper += '</td></tr><tr class="spacer"></tr>';
		}

		// end of quiz item section	
		paper += '</table>';

		// reset timer
		clearInterval(timer.interval);
		timer.ticks = 0;

		quizActive = true;

		// start timer
		timer.interval = setInterval(function () {
			timer.ticks++;

			var timeLeft = (currentQuiz.duration * 60) - timer.ticks;
			var minPortion = padDigits(parseInt(timeLeft / 60, 10), 2);
			var secPortion = padDigits(timeLeft % 60, 2);
			var timeColor = timeLeft / (currentQuiz.duration * 60) < 0.25 ? 'red' : 'white';

			$('#hud-timer').html('<span style="color: ' + timeColor + '">' + minPortion + ':' + secPortion + '</span>');

			// check if time's up
			if (timeLeft / 60 === 0) {
				$('#hud-timer').html('<strong>Time is Up!</strong>');
				ml.endQuiz();
			}
		}, 1000);

		$('#start-quiz-btn').html('End Quiz');

		return paper;
	};

	ml.endQuiz = function () {
		clearInterval(timer.interval);
		timer.ticks = 0;
		quizActive = false;
		$('#start-quiz-btn').html('Start Quiz');
		ml.checkPaper();
	};

	ml.checkPaper = function () {
		// Check the paper via the paperId container
		var totalItems = currentQuiz.items.length;
		var maxPoints = 0;
		for (var i = 0; i < currentQuiz.items.length; i++) {
			for (var n = 0; n < currentQuiz.items[i].choices.length; n++) {
				if (currentQuiz.items[i].choices[n].correct) {
					maxPoints++;
				}
			}
		}
		var totalCorrect = $('input[name^=choice][value=true]:checked').size();
		var result = '<span><strong>' + totalCorrect + ' / ' + maxPoints + '</strong></span><br>';
		var percentage = totalCorrect / maxPoints;

		result += '<span style="font-style: italic; font-size: 22px;">';
		if (percentage === 1) {
			result += 'PERFECT!!!';
		}
		else if (percentage >= 0.95) {
			result += 'Excellent!';
		}
		else if (percentage >= 0.85) {
			result += 'Good!';
		}
		else if (percentage >= 0.75) {
			result += 'Barely Passed :(';
		}
		else {
			result += 'Try Again T_T';
		}
		result += '</span>';
		
		// start extras
		var date = new Date();
		var year = date.getFullYear();
		var month = date.getMonth() + 1;
		var day = date.getDate();

		var nthMonth = ((year - 2010 - 1) * 12) + 3 + month;

		var suffix = 'th';
		var start = 0;

		if (day === 9) {
			result += '<div id="papi" style="font-size: 22px; position: absolute; width: 500px; bottom: 20px; left: 50%; margin-left: -250px;">Happy <span id="nth-month">0th</span> Monthsary Papi Kim2x Koh! ~ Moge<br>I love you so much! <3</div>';
			$('#result').html(result);

			var nthsaryInterval = setInterval(function() {
				start++;

				switch (start % 10) {
					case 1:
						suffix = 'st';
						break;
					case 2:
						suffix = 'nd';
						break;
					case 3:
						suffix = 'rd';
						break;
					default:
						suffix = 'th'
						break;
				}

				$('#nth-month').html(start + suffix);
				if (start === nthMonth) {
					clearInterval(nthsaryInterval);
				}
			}, 50);
		}
		else {
			$('#result').html(result);
		}
		$('#overlay').fadeIn(200);

		// highlight correct answers
		$('input[name^=choice][value=true]:checked').closest('.quiz-choice').addClass('correct');

		// highlight incorrect answers
		$('input[name^=choice][value=false]:checked').closest('.quiz-choice').addClass('wrong');

		// highlight correct answers that were not selected
		$('input[name^=choice][value=true]:not(:checked)').closest('.quiz-choice').addClass('missed');
	};

	ml.goToMain = function () {
		// return to main menu
		$('#editor-control').hide();
		$('#quiz-control').show();
		$('#quiz-area').html('');
		$('#dl-area').html('');
	};

	// Quiz Editor Methods

	ml.goToEditor = function () {
		if (quizActive) return; // prevent editing when quiz is running

		// Setup Quiz Editor
		$('#quiz-control').hide(); // hide quiz controls
		$('#editor-control').show(); // show editor controls

		ml.newQuiz();
	};

	ml.newQuiz = function () {

		$('#dl-area').html('');

		var initTable = '\
		    <table id="details">\
		        <tr>\
		            <td>Name:</td>\
		            <th colspan="3" contenteditable="true"></th>\
		        </tr>\
		        <tr>\
		            <td>Description:</td>\
		            <th colspan="3" contenteditable="true"></th>\
		        </tr>\
		        <tr>\
		            <td>Duration:</td>\
		            <th colspan="3" contenteditable="true"></th>\
		        </tr>\
		        <tr>\
		            <td>Instructions:</td>\
		            <th colspan="3" contenteditable="true"></th>\
		        </tr>\
		    </table>\
		    <br>\
		    <table id="items">\
		        <tr class="item">\
		            <td>\
		                <table>\
		                    <tr class="question">\
		                        <td>\
		                            <table>\
		                                <tr>\
		                                    <th class="num-col">1.</th>\
		                                    <th class="qtext" colspan="2" contenteditable="true" onkeyup="if (event.keyCode === 39 && event.shiftKey) {QuizMaster.addChoiceQ($(this))} else if (event.keyCode === 40 && event.shiftKey) {QuizMaster.addItem()}; if ($(this).html() === \'<br>\') {$(this).html(\'\')}"></th>\
		                                    <td class="rem-q"><button tabindex="-1" onclick="$(this).closest(\'.item\').remove(); QuizMaster.reNumber();">x</button></td>\
		                                </tr>\
		                            </table>\
		                        </td>\
		                    </tr>\
		                    <tr class="choices">\
		                        <td>\
		                            <table>\
		                                <tr class="choice"><td class="num-col"></td><td class="qcheck"><input type="checkbox" value="" tabindex="-1"></td><td class="choice-text" contenteditable="true" onkeyup="if (event.keyCode === 39 && event.shiftKey) {QuizMaster.addChoice($(this))} else if (event.keyCode === 40 && event.shiftKey) {QuizMaster.addItem()}; if ($(this).html() === \'<br>\') {$(this).html(\'\')}"></td><td class="rem-ch"><button tabindex="-1" onclick="$(this).closest(\'tr\').remove()">x</button></td></tr>\
		                            </table>\
		                        </td>\
		                    </tr>\
		                    <tr class="spacer"></tr>\
		                </table>\
		            </td>\
		        </tr>\
		    </table>\
		';

		$('#quiz-area').html(initTable); // clear quiz area
		ml.postNotice('New Quiz Created!');
	};

    ml.addChoice = function (field) {         
        // add new field
        field.closest('table').append('<tr class="choice"><td class="num-col"></td><td class="qcheck"><input type="checkbox" value="" tabindex="-1"></td><td class="choice-text" contenteditable="true" onkeyup="if (event.keyCode === 39 && event.shiftKey) {QuizMaster.addChoice($(this));} else if (event.keyCode === 40 && event.shiftKey) {QuizMaster.addItem()}; if ($(this).html() === \'<br>\') {$(this).html(\'\')}"></td><td class="rem-ch"><button tabindex="-1" onclick="$(this).closest(\'tr\').remove()">x</button></td></tr>');
    
        // focus new field
        field.closest('table').children().children().last().children(':nth-child(3)').focus();
    };
    
    ml.addChoiceQ = function (field) {
        // add new field
        field.closest('.question').parent().children(':nth-child(2)').children().children().append('<tr class="choice"><td class="num-col"></td><td class="qcheck"><input type="checkbox" value="" tabindex="-1"></td><td class="choice-text" contenteditable="true" onkeyup="if (event.keyCode === 39 && event.shiftKey) {QuizMaster.addChoice($(this));} else if (event.keyCode === 40 && event.shiftKey) {QuizMaster.addItem()}; if ($(this).html() === \'<br>\') {$(this).html(\'\')}"></td><td class="rem-ch"><button tabindex="-1" onclick="$(this).closest(\'tr\').remove()">x</button></td></tr>');
    
        // focus new field
        field.closest('.question').parent().children(':nth-child(2)').children().children().children().children().last().children(':nth-child(3)').focus();
    };
    
    ml.addItem = function () {
        var number = $('.item').size() + 1;
    
        var item = '\
            <tr class="item">\
                <td>\
                    <table>\
                        <tr class="question">\
                            <td>\
                                <table>\
                                    <tr>\
                                        <th class="num-col">' + number + '.</th>\
                                        <th class="qtext" colspan="2" contenteditable="true" onkeyup="if (event.keyCode === 39 && event.shiftKey) {QuizMaster.addChoiceQ($(this))} else if (event.keyCode === 40 && event.shiftKey) {QuizMaster.addItem()}; if ($(this).html() === \'<br>\') {$(this).html(\'\')}"></th>\
                                        <td class="rem-q"><button tabindex="-1" onclick="$(this).closest(\'.item\').remove(); QuizMaster.reNumber();">x</button></td>\
                                    </tr>\
                                </table>\
                            </td>\
                        </tr>\
                        <tr class="choices">\
                            <td>\
                                <table>\
                                    <tr class="choice"><td class="num-col"></td><td class="qcheck"><input type="checkbox" value="" tabindex="-1"></td><td class="choice-text" contenteditable="true" onkeyup="if (event.keyCode === 39 && event.shiftKey) {QuizMaster.addChoice($(this));} else if (event.keyCode === 40 && event.shiftKey) {QuizMaster.addItem()}; if ($(this).html() === \'<br>\') {$(this).html(\'\')}"></td><td class="rem-ch"><button tabindex="-1" onclick="$(this).closest(\'tr\').remove()">x</button></td></tr>\
                                </table>\
                            </td>\
                        </tr>\
                        <tr class="spacer"></tr>\
                    </table>\
                </td>\
            </tr>\
        ';
        
        // append new item
        $('#items').append(item);
        
        // focus on new item question field
        $('.item').last().find('td > table > tbody > .question > td > table > tbody > tr').children(':nth-child(2)').focus();
    };
    
    ml.reNumber = function () {
        var number = 1;
        $('.item').each(function () {
            $(this).find('td > table > tbody > .question > td > table > tbody > tr').children(':nth-child(1)').html(number + '.');
            number++;
        });
    };

    ml.convertToJSON = function () {
        // parse quiz-area and convert it to a quiz (in JSON)
        
        var details = $('#details').children();

        // setup details section
        var quiz = {
            name: details.children(':nth-child(1)').children(':nth-child(2)').html(),
            description: details.children(':nth-child(2)').children(':nth-child(2)').html(),
            duration: parseFloat(details.children(':nth-child(3)').children(':nth-child(2)').html()),
            instruction: details.children(':nth-child(4)').children(':nth-child(2)').html(),
            items: []
        };

        // loop through the html items
        $('.item').each(function () {

            var chs = [];
            $(this).find('td > table > tbody > .choices > td > table > tbody > .choice').each(function() {
                chs.push({
                    correct: $(this).children(':nth-child(2)').children('input[type=checkbox]').is(':checked'),
                    text: $(this).children(':nth-child(3)').html()
                });
            });

            quiz.items.push({
                question: $(this).children().children().children().children(':nth-child(1)').children().children().children().children().children(':nth-child(2)').html(),
                answers: 1,
                choices: chs
            });
        });

        return JSON.stringify(quiz, null, 2); // convert to JSON and prettify
    };
    
    ml.exportQuiz = function () {
    	// export as JSON
        var quizJSON = ml.convertToJSON();
        var quizName = $('#details').find('tbody > tr > th').html();
        var filename = quizName.split(' ').join('_').toLowerCase() + '.json';
        $('#dl-area').html('Download: <a id="export-link" download="' + filename + '" href="data:application/json,' + encodeURIComponent(quizJSON) + '">' + filename + '</a>');
        $('#export-link')[0].click();
		ml.postNotice('Quiz Exported as JSON!');
    };

	ml.saveQuiz = function () {
		// check if quiz-name is empty
		var quizName = $('#details').find('tbody > tr > th').html();
		if (quizName === '') {
			ml.postNotice('Save Failed! Name Required.');
			return;
		}
		else if (ml.isReserved(quizName)) {
			ml.postNotice('Save Failed! Name is Reserved.');
			return;
		}

		ml.postNotice('Quiz Saved!');

		// save quiz to cookie
		localStorage.setItem(quizName, ml.convertToJSON());
	};

	ml.loadQuiz = function () {
		// load quiz from cookie

		if (localStorage.length === 0) {
			ml.postNotice('Nothing to Load.');
			return;
		}

		// build list of saved quizzes
		var list = '';
		for (var i = 0; i < localStorage.length; i++) {
			if (ml.isReserved(localStorage.key(i))) continue; // don't show special storage
			list += '<div class="local-storage-item"><span class="savefile" onclick="QuizMaster.loadToEditor(QuizMaster.getFromLocalStorage(\'' + localStorage.key(i) + '\')); $(\'#overlay\').hide()">' + localStorage.key(i) + '.json</span><span class="remove-savefile-btn" onclick="if (event.ctrlKey) {localStorage.removeItem(\'' + localStorage.key(i) + '\'); QuizMaster.postNotice(\'SaveFile Removed.\')} else {QuizMaster.postNotice(\'Use: [Ctrl + LeftClick] to Remove SaveFile.\')}">[x]</span></div>'
		}

		$('#result').html('<span>Select SaveFile.</span>' + list);
		$('#overlay').fadeIn();
	};

	ml.getFromLocalStorage = function (key) {
		return JSON.parse(localStorage.getItem(key));
	};

	ml.importQuiz = function (file) {
		// Import quiz

		var r = new FileReader();
		r.onload = function (e) {
			var quiz = JSON.parse(e.target.result);

			ml.loadToEditor(quiz);
		};
		r.readAsText(file);
	};

	ml.loadToEditor = function (quiz) {
		// build quiz string for editor loading
		var str = '<table id="details">';
		str += '<tr><td>Name:</td><th colspan="3" contenteditable="true">' + quiz.name + '</th></tr>';
		str += '<tr><td>Description:</td><th colspan="3" contenteditable="true">' + quiz.description + '</th></tr>';
		str += '<tr><td>Duration:</td><th colspan="3" contenteditable="true">' + quiz.duration + '</th></tr>';
		str += '<tr><td>Instructions:</td><th colspan="3" contenteditable="true">' + quiz.instruction + '</th></tr>';
		str += '</table><br>';

		str += '<table id="items">';
		for (var i = 0; i < quiz.items.length; i++) {
			str += '<tr class="item"><td><table>';
			str += '\
                <tr class="question">\
                    <td>\
                        <table>\
                            <tr>\
                                <th class="num-col">' + (i+1) + '.</th>\
                                <th class="qtext" colspan="2" contenteditable="true" onkeyup="if (event.keyCode === 39 && event.shiftKey) {QuizMaster.addChoiceQ($(this))} else if (event.keyCode === 40 && event.shiftKey) {QuizMaster.addItem()}; if ($(this).html() === \'<br>\') {$(this).html(\'\')}">' + quiz.items[i].question + '</th>\
                                <td class="rem-q"><button tabindex="-1" onclick="$(this).closest(\'.item\').remove(); QuizMaster.reNumber();">x</button></td>\
                            </tr>\
                        </table>\
                    </td>\
                </tr>\
                <tr class="choices">\
                    <td>\
                        <table>';
                // loop through choices
                for (var n = 0; n < quiz.items[i].choices.length; n++) {
                	var checkValue = quiz.items[i].choices[n].correct ? 'checked' : '';
                	str += '<tr class="choice"><td class="num-col"></td><td class="qcheck"><input type="checkbox" value="" tabindex="-1" ' + checkValue + '></td><td class="choice-text" contenteditable="true" onkeyup="if (event.keyCode === 39 && event.shiftKey) {QuizMaster.addChoice($(this));} else if (event.keyCode === 40 && event.shiftKey) {QuizMaster.addItem()}; if ($(this).html() === \'<br>\') {$(this).html(\'\')}">' + quiz.items[i].choices[n].text + '</td><td class="rem-ch"><button tabindex="-1" onclick="$(this).closest(\'tr\').remove()">x</button></td></tr>';
                }
            str += '\
                        </table>\
                    </td>\
                </tr>\
                <tr class="spacer"></tr>\
            ';
			str += '</table></td></tr>';
		}
		str += '</table>';

		// load string to quiz-area
		$('#quiz-area').html(str);

		ml.postNotice('Quiz Loaded!');
	};

	ml.postNotice = function (text) {
		$('#editor-notifications').html(text);
		$('#editor-notifications').finish().show().delay(3000).fadeOut();
	};

	return ml;
}());