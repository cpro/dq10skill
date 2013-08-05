


var Simulator = (function($) {
	//定数
	var SKILL_PTS_MIN = 0;
	var SKILL_PTS_MAX = 100;
	var LEVEL_MIN = 1;
	var LEVEL_MAX = 75;
	var TRAINING_SKILL_PTS_MIN = 0;
	var TRAINING_SKILL_PTS_MAX = 5;
	var LEVEL_FOR_TRAINING_MODE = 50;
	
	var DATA_JSON_URI = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1) + 'dq10skill-data.json';
	
	//データロード
	var allData;
	$.ajaxSetup({async: false});
	$.getJSON(DATA_JSON_URI, function(data) {
		allData = data;
	});
	$.ajaxSetup({async: true});
	
	if(!allData) return null;
	
	var skillCategories = allData.skillCategories;
	var vocations = allData.vocations;
	var skillPtsGiven = allData.skillPtsGiven;
	var expRequired = allData.expRequired;
	var trainingPts = allData.trainingPts;
	
	//パラメータ格納用
	var skillPts = {};
	var levels = {};
	var trainingSkillPts = {};
	
	//パラメータ初期化
	for(var vocation in vocations) {
		skillPts[vocation] = {};
		for(var s = 0; s < vocations[vocation].skills.length; s++) {
			var skill = vocations[vocation].skills[s];
			skillPts[vocation][skill] = 0;
		}
		levels[vocation] = LEVEL_MIN;
		trainingSkillPts[vocation] = TRAINING_SKILL_PTS_MIN;
	}
	
	/* メソッド */
	//スキルポイント取得
	function getSkillPt(vocation, skill) {
		return skillPts[vocation][skill];
	}
	
	//スキルポイント更新：不正値の場合falseを返す
	function updateSkillPt(vocation, skill, newValue) {
		var oldValue = skillPts[vocation][skill];
		if(newValue < SKILL_PTS_MIN || newValue > SKILL_PTS_MAX) {
			return false;
		}
		if(totalOfSameSkills(skill) - oldValue + newValue > SKILL_PTS_MAX) {
			return false;
		}
		
		skillPts[vocation][skill] = newValue;
		return true;
	}
	
	//レベル値取得
	function getLevel(vocation) {
		return levels[vocation];
	}
	
	//レベル値更新
	function updateLevel(vocation, newValue) {
		var oldValue = levels[vocation];
		if(newValue < LEVEL_MIN || newValue > LEVEL_MAX) {
			return oldValue;
		}
		
		levels[vocation] = newValue;
		return newValue;
	}
	
	//特訓スキルポイント取得
	function getTrainingSkillPt(vocation) {
		return trainingSkillPts[vocation];
	}
	
	//特訓スキルポイント更新
	function updateTrainingSkillPt(vocation, newValue) {
		if(newValue < TRAINING_SKILL_PTS_MIN || newValue > TRAINING_SKILL_PTS_MAX)
			return false;
		
		trainingSkillPts[vocation] = newValue;
		return true;
	}
	
	//職業のスキルポイント合計
	function totalSkillPts(vocation) {
		var total = 0;
		for(var skill in skillPts[vocation])
			total += skillPts[vocation][skill];
		
		return total;
	}
	
	//同スキルのポイント合計
	function totalOfSameSkills(skill) {
		var total = 0;
		for(var vocation in skillPts) {
			if(skillPts[vocation][skill])
				total += skillPts[vocation][skill];
		}
		return total;
	}
	
	//特定スキルすべてを振り直し（0にセット）
	function clearPtsOfSameSkills(skill) {
		for(var vocation in skillPts) {
			if(skillPts[vocation][skill])
				updateSkillPt(vocation, skill, 0);
		}
	}
	
	//すべてのスキルを振り直し（0にセット）
	function clearAllSkills() {
		for(var vocation in skillPts) {
			for(var skill in skillPts[vocation]) {
				skillPts[vocation][skill] = 0;
			}
		}
	}
	
	//職業レベルに対するスキルポイント最大値
	function maxSkillPts(vocation) {
		return skillPtsGiven[levels[vocation]];
	}
	
	//スキルポイント合計に対する必要レベル取得
	function requiredLevel(vocation) {
		var trainingSkillPt = getTrainingSkillPt(vocation);
		var total = totalSkillPts(vocation) - trainingSkillPt;
		
		for(var l = LEVEL_MIN; l <= LEVEL_MAX; l++) {
			if(skillPtsGiven[l] >= total) {
				//特訓スキルポイントが1以上の場合、最低レベル50必要
				if(trainingSkillPt > TRAINING_SKILL_PTS_MIN && l < LEVEL_FOR_TRAINING_MODE)
					return LEVEL_FOR_TRAINING_MODE;
				else
					return l;
			}
		}
		return NaN;
	}
	
	//職業・レベルによる必要経験値
	function requiredExp(vocation, level) {
		return expRequired[vocations[vocation].expTable][level];
	}
	
	//不足経験値
	function requiredExpRemain(vocation) {
		var required = requiredLevel(vocation);
		if(required <= levels[vocation]) return 0;
		var remain = requiredExp(vocation, required) - requiredExp(vocation, levels[vocation]);
		return remain;
	}
	
	//全職業の必要経験値合計
	function totalRequiredExp() {
		var total = 0;
		for(var vocation in vocations) {
			total += requiredExp(vocation, levels[vocation]);
		}
		return total;
	}
	
	//全職業の不足経験値合計
	function totalExpRemain() {
		var total = 0;
		for(var vocation in vocations) {
			total += requiredExpRemain(vocation);
		}
		return total;
	}
	
	//各種パッシブスキルのステータス加算合計
	//ちから      : pow
	//みのまもり  : def
	//きようさ    : dex
	//すばやさ    : spd
	//こうげき魔力: magic
	//かいふく魔力: heal
	//さいだいHP  : maxhp
	//さいだいMP  : maxmp
	//みりょく    : charm
	function totalStatus(status) {
		//スキルカテゴリデータの各スキルから上記プロパティを調べ合計する
		var total = 0;
		var skills;
		for(var skillCategory in skillCategories) {
			skills = skillCategories[skillCategory].skills;
			for(var i = 0; i < skills.length; i++) {
				if(totalOfSameSkills(skillCategory) < skills[i].pt)
					break;
				
				if(skills[i][status])
					total += skills[i][status];
			}
		}
		
		return total;
	}
	
	//API
	return {
		//メソッド
		getSkillPt: getSkillPt,
		updateSkillPt: updateSkillPt,
		getLevel: getLevel,
		updateLevel: updateLevel,
		getTrainingSkillPt : getTrainingSkillPt,
		updateTrainingSkillPt : updateTrainingSkillPt,
		totalSkillPts: totalSkillPts,
		totalOfSameSkills: totalOfSameSkills,
		clearPtsOfSameSkills: clearPtsOfSameSkills,
		clearAllSkills: clearAllSkills,
		maxSkillPts: maxSkillPts,
		requiredLevel: requiredLevel,
		requiredExp: requiredExp,
		requiredExpRemain: requiredExpRemain,
		totalRequiredExp: totalRequiredExp,
		totalExpRemain: totalExpRemain,
		totalStatus: totalStatus,
		
		//プロパティ
		skillCategories: skillCategories,
		vocations: vocations,
		skillPtsGiven: skillPtsGiven,
		expRequired: expRequired,
		trainingPts: trainingPts,
		vocationOrder: allData.vocationOrder,
		
		//定数
		SKILL_PTS_MIN: SKILL_PTS_MIN,
		SKILL_PTS_MAX: SKILL_PTS_MAX,
		LEVEL_MIN: LEVEL_MIN,
		LEVEL_MAX: LEVEL_MAX,
		TRAINING_SKILL_PTS_MIN: TRAINING_SKILL_PTS_MIN,
		TRAINING_SKILL_PTS_MAX: TRAINING_SKILL_PTS_MAX,
		LEVEL_FOR_TRAINING_MODE: LEVEL_FOR_TRAINING_MODE
	};
})(jQuery);

var SimulatorUI = (function($) {
	var CLASSNAME_SKILL_ENABLED = 'enabled';
	var CLASSNAME_ERROR = 'error';
	
	var sim = Simulator;
	
	function refreshAll() {
		refreshAllVocationInfo();
		for(var skill in sim.skillCategories) {
			refreshSkillList(skill);
		}
		refreshTotalRequiredExp();
		refreshTotalExpRemain();
		refreshTotalPassive();
		refreshControls();
		refreshSaveUrl();
	}
	
	function refreshVocationInfo(vocation) {
		var currentLevel = sim.getLevel(vocation);
		var requiredLevel = sim.requiredLevel(vocation);
		
		//見出し中のレベル数値
		$('#' + vocation + ' .lv_h2').text(currentLevel);
		var $levelH2 = $('#' + vocation + ' h2');
		
		//必要経験値
		$('#' + vocation + ' .exp').text(numToFormedStr(sim.requiredExp(vocation, currentLevel)));
		
		//スキルポイント 残り / 最大値
		var maxSkillPts = sim.maxSkillPts(vocation);
		var additionalSkillPts = sim.getTrainingSkillPt(vocation);
		var remainingSkillPts = maxSkillPts + additionalSkillPts - sim.totalSkillPts(vocation);
		var $skillPtsText = $('#' + vocation + ' .pts');
		$skillPtsText.text(remainingSkillPts + ' / ' + maxSkillPts);
		if(additionalSkillPts > 0)
			$skillPtsText.append('<small> + ' + additionalSkillPts + '</small>');
		
		//Lv不足の処理
		var isLevelError = (isNaN(requiredLevel) || currentLevel < requiredLevel);
		
		$levelH2.toggleClass(CLASSNAME_ERROR, isLevelError);
		$skillPtsText.toggleClass(CLASSNAME_ERROR, isLevelError);
		$('#' + vocation + ' .error').toggle(isLevelError);
		if(isLevelError) {
			$('#' + vocation + ' .req_lv').text(numToFormedStr(requiredLevel));
			$('#' + vocation + ' .exp_remain').text(numToFormedStr(sim.requiredExpRemain(vocation)));
		}
	}
	
	function refreshAllVocationInfo() {
		for(var vocation in sim.vocations) {
			refreshVocationInfo(vocation);
		}
	}
	
	function refreshTotalRequiredExp() {
		$('#total_exp').text(numToFormedStr(sim.totalRequiredExp()));
	}
	
	function refreshTotalExpRemain() {
		var totalExpRemain = sim.totalExpRemain();
		$('#total_exp_remain, #total_exp_remain_label').toggleClass(CLASSNAME_ERROR, totalExpRemain > 0);
		$('#total_exp_remain').text(numToFormedStr(totalExpRemain));
	}
	
	function refreshTotalPassive() {
		var status = 'maxhp,maxmp,pow,def,dex,spd,magic,heal,charm'.split(',');
		for(var i = 0; i < status.length; i++) {
			$('#total_' + status[i]).text(sim.totalStatus(status[i]));
		}
	}
	
	function refreshSkillList(skill) {
		$('tr[class^=' + skill + '_]').removeClass(CLASSNAME_SKILL_ENABLED); //クリア
		var totalOfSkill = sim.totalOfSameSkills(skill);
		var skills = sim.skillCategories[skill].skills;
		for(var s = 0; s < skills.length; s++) {
			if(totalOfSkill < skills[s].pt)
				break;
			
			$('.' + skill + '_' + s.toString()).addClass(CLASSNAME_SKILL_ENABLED);
		}
		$('.' + skill + ' .skill_total').text(totalOfSkill);
	}
	
	function refreshControls() {
		for(var vocation in sim.vocations) {
			$('#' + vocation + ' .lv_select>select').val(sim.getLevel(vocation));
			$('#' + vocation + ' .training_pt').val(sim.getTrainingSkillPt(vocation));
			
			for(var s = 0; s < sim.vocations[vocation].skills.length; s++) {
				var skill = sim.vocations[vocation].skills[s];
				//$('#' + vocation + ' .' + skill + ' :text').val(sim.getSkillPt(vocation, skill));
				$('#' + vocation + ' .' + skill + ' .ptspinner').spinner('value', sim.getSkillPt(vocation, skill));
			}
		}
	}
	
	function refreshSaveUrl() {
		var url = window.location.href.replace(window.location.search, "") + '?' + Base64Param.encode()
		$('#url_text').val(url);
		
		var params = {
			text: 'DQ10 現在のスキル構成:',
			hashtags: 'DQ10, DQX, dq10_skillsim',
			url: url,
			original_referer: window.location.href,
			tw_p: 'tweetbutton'
		}
		$('#tw-saveurl').attr('href', 'https://twitter.com/intent/tweet?' + $.param(params));
	}
	
	function setup() {
		for(var i = 0; i < setupFunctions.length; i++) {
			setupFunctions[i]();
		}
		refreshAll();
	}
	
	var setupFunctions = [
		//レベル選択セレクトボックス項目設定
		function() {
			var $select = $('.lv_select>select');
			for(var i = sim.LEVEL_MIN; i <= sim.LEVEL_MAX; i++) {
				$select.append($("<option />").val(i).text(i.toString() + ' (' + sim.skillPtsGiven[i].toString() + ')'));
			}
		},
		
		//レベル選択セレクトボックス変更時
		function() {
			for(var vocation in sim.vocations) {
				(function(vocation) {
					$('#' + vocation + ' .lv_select>select').change(function() {
						sim.updateLevel(vocation, $(this).val());
						refreshVocationInfo(vocation);
						refreshTotalRequiredExp();
						refreshTotalExpRemain();
						refreshSaveUrl();
					});
				})(vocation);
			}
		},
		
		//特訓ポイント選択スピンボタン設定
		function() {
			var $spinner = $('.training_pt');
			$spinner.spinner({
				min: sim.TRAINING_SKILL_PTS_MIN,
				max: sim.TRAINING_SKILL_PTS_MAX,
				spin: function (e, ui) {
					var vocation = $(this).parents('.class_group').attr('id');
					
					if(sim.updateTrainingSkillPt(vocation, parseInt(ui.value))) {
						refreshVocationInfo(vocation);
						refreshTotalRequiredExp();
						refreshTotalExpRemain();
					} else {
						return false;
					}
				},
				change: function (e, ui) {
					var vocation = $(this).parents('.class_group').attr('id');
					
					if(isNaN($(this).val())) {
						$(this).val(sim.getTraningSkillPt(vocation));
						return false;
					}
					if(sim.updateTrainingSkillPt(vocation, parseInt($(this).val()))) {
						refreshVocationInfo(vocation);
						refreshTotalRequiredExp();
						refreshTotalExpRemain();
						refreshSaveUrl();
					} else {
						$(this).val(sim.getTraningSkillPt(vocation));
						return false;
					}
				},
				stop: function (e, ui) {
					refreshSaveUrl();
				}
			});
		},
		
		//スピンボタン設定
		function() {
			$spinner = $('.ptspinner');
			$spinner.spinner({
				min: sim.SKILL_PTS_MIN,
				max: sim.SKILL_PTS_MAX,
				spin: function (e, ui) {
					var vocation = $(this).parents('.class_group').attr('id');
					var skill =  $(this).parents('.skill_table').attr('class').split(' ')[0];
					
					if(sim.updateSkillPt(vocation, skill, parseInt(ui.value))) {
						refreshSkillList(skill);
						refreshAllVocationInfo();
						refreshTotalExpRemain();
						refreshTotalPassive();
						e.stopPropagation();
					} else {
						return false;
					}
				},
				change: function (e, ui) {
					var vocation = $(this).parents('.class_group').attr('id');
					var skill =  $(this).parents('.skill_table').attr('class').split(' ')[0];
					
					if(isNaN($(this).val())) {
						$(this).val(sim.getSkillPt(vocation, skill));
						return false;
					}
					if(sim.updateSkillPt(vocation, skill, parseInt($(this).val()))) {
						refreshSkillList(skill);
						refreshAllVocationInfo();
						refreshTotalExpRemain();
						refreshTotalPassive();
						refreshSaveUrl();
					} else {
						$(this).val(sim.getSkillPt(vocation, skill));
						return false;
					}
				},
				stop: function (e, ui) {
					refreshSaveUrl();
				}
			});
			//テキストボックスクリック時数値を選択状態に
			$spinner.click(function(e) {
				$(this).select();
			});
			//テキストボックスでEnter押下時更新して選択状態に
			$spinner.keypress(function(e) {
				if(e.which == 13) {
					$('#url_text').focus();
					$(this).focus().select();
				}
			});
		},
		
		//リセットボタン設定
		function() {
			$reset = $('.reset').button({
				icons: { primary: 'ui-icon-refresh' },
				text: false
			}).click(function (e) {
				var vocation = $(this).parents('.class_group').attr('id');
				var skill =  $(this).parents('.skill_table').attr('class').split(' ')[0];
				
				sim.updateSkillPt(vocation, skill, 0);
				$('#' + vocation + ' .' + skill + ' .ptspinner').spinner('value', sim.getSkillPt(vocation, skill));
				refreshSkillList(skill);
				refreshAllVocationInfo();
				refreshTotalExpRemain();
				refreshTotalPassive();
				refreshSaveUrl();
			}).dblclick(function (e) {
				//ダブルクリック時に各職業の該当スキルをすべて振り直し
				var skillCategory = $(this).parents('.skill_table').attr('class').split(' ')[0];
				var skillName = sim.skillCategories[skillCategory].name;
				
				if(!window.confirm('スキル「' + skillName + '」をすべて振りなおします。'))
					return;
				
				sim.clearPtsOfSameSkills(skillCategory);
				$('.' + skillCategory + ' .ptspinner').spinner('value', 0);
				refreshSkillList(skillCategory);
				refreshAllVocationInfo();
				refreshTotalExpRemain();
				refreshTotalPassive();
				refreshSaveUrl();
			});
		},
		
		//スキルテーブル項目クリック時
		function() {
			for(var vocation in sim.vocations) {
				for(var s = 0; s < sim.vocations[vocation].skills.length; s++) {
					var skill = sim.vocations[vocation].skills[s];
					
					(function(vocation, skill) {
						$('#' + vocation + ' tr[class^=' + skill + '_]').each(function() {
							$(this).click(function() {
								var totalPtsOfOthers = sim.totalOfSameSkills(skill) - sim.getSkillPt(vocation, skill);
								
								var clickedSkillIndex = parseInt($(this).attr('class').replace(skill + '_', ''));
								var requiredPt = sim.skillCategories[skill].skills[clickedSkillIndex].pt;
								if(requiredPt < totalPtsOfOthers) return;
								
								sim.updateSkillPt(vocation, skill, requiredPt - totalPtsOfOthers);
								$('#' + vocation + ' .' + skill + ' :text').val(sim.getSkillPt(vocation, skill));
								
								refreshSkillList(skill);
								refreshAllVocationInfo();
								refreshTotalExpRemain();
								refreshTotalPassive();
								refreshSaveUrl();
								
								return false;
							});
						});
					})(vocation, skill);
				}
			}
		},
		
		//ヒントテキスト設定
		function() {
			for(var skillCategory in sim.skillCategories) {
				for(var skillIndex = 0; skillIndex < sim.skillCategories[skillCategory].skills.length; skillIndex++) {
					var skill = sim.skillCategories[skillCategory].skills[skillIndex];
					var hintText = skill.desc;
					if(skill.mp != null)
						hintText += '\n（消費MP: ' + skill.mp.toString() + '）';
					if(skill.gold)
						hintText += '\n（' + skill.gold.toString() + 'G）';
					$('.' + skillCategory + '_' + skillIndex.toString()).attr('title', hintText);
				}
			}
		},
		
		//URLテキストボックスクリック時
		function() {
			$('#url_text').click(function() {
				$(this).select();
			});
		},
		
		//保存用URLツイートボタン設定
		function() {
			$('#tw-saveurl').button().click(function(e) {
				var screenWidth = screen.width, screenHeight = screen.height;
				var windowWidth = 550, windowHeight = 420;
				var windowLeft = Math.round(screenWidth / 2 - windowWidth / 2);
				var windowTop = windowHeight >= screenHeight ? 0 : Math.round(screenHeight / 2 - windowHeight / 2);
				var windowParams = {
					scrollbars: 'yes',
					resizable: 'yes',
					toolbar: 'no',
					location: 'yes',
					width: windowWidth,
					height: windowHeight,
					left: windowLeft,
					top: windowTop
				};
				var windowParam = $.map(windowParams, function(val, key) { return key + '=' + val; }).join(',');
				window.open(this.href, null, windowParam);
				
				return false;
			});
		},
		
		//おりたたむ・ひろげるボタン追加
		function() {
			var HEIGHT_FOLDED = '2.5em';
			var HEIGHT_UNFOLDED = $('.class_group').height() + 'px';
			
			var $foldButton = $('<p>▲おりたたむ</p>').addClass('fold').hide().click(function() {
				$(this).parents('.class_group').animate({height: HEIGHT_FOLDED}, 0).addClass('folded').removeClass('unfolded');
				$(this).hide();
			});
			var $unfoldButton = $('<p>▼ひろげる</p>').addClass('unfold').hide().click(function() {
				$(this).parents('.class_group').animate({height: HEIGHT_UNFOLDED}).addClass('unfolded').removeClass('folded');
				$(this).hide();
			});
			$('.class_info').append($foldButton).append($unfoldButton);
			$('.class_group').addClass('unfolded');
			
			//職業情報欄ポイント時のみ表示する
			$('.class_info').hover(function() {
				if($(this).parents('.class_group').hasClass('folded')) {
					$(this).children('.unfold').show();
				}
				if($(this).parents('.class_group').hasClass('unfolded')) {
					$(this).children('.fold').show();
				}
			}, function() {
				$(this).children('.fold, .unfold').hide();
			});
			
			//すべておりたたむ・すべてひろげるボタン追加
			$('#fold-all').click(function(e) {
				$('.class_info .fold').click();
				$('body, html').animate({scrollTop: 0});
			});
			$('#unfold-all').click(function(e) {
				$('.class_info .unfold').click();
				$('body, html').animate({scrollTop: 0});
			});
			
			var bodyTop = $('#body_content').offset().top;
			
			//特定職業のみひろげるボタン追加
			$('#foldbuttons-vocation a').click(function(e) {
				var vocation = $(this).attr('id').replace('fold-', '');
				$('body, html').animate({scrollTop: $('#' + vocation).offset().top - bodyTop});
				$('#' + vocation + ' .unfold').click();
			});
			//特定スキルを持つ職業のみひろげるボタン追加
			$('#foldbuttons-skillCategory a').click(function(e) {
				var skillCategory = $(this).attr('id').replace('fold-', '');
				var vocationsHaveSkill = [];
				for(var i = 0; i < sim.vocationOrder.length; i++) {
					var vocation = sim.vocationOrder[i];
					
					if($.inArray(skillCategory, sim.vocations[vocation]['skills']) >= 0)
						vocationsHaveSkill.push(vocation);
				}
				
				var $folded = $('.class_info .fold');
				var $unfolded = $('');
				for(var i = 0; i < vocationsHaveSkill.length; i++) {
					var vocation = vocationsHaveSkill[i];
					
					$folded = $folded.not('#' + vocation + ' .fold');
					$unfolded = $unfolded.add('#' + vocation + ' .unfold');
				}
				
				$folded.click();
				$('body, html').animate({scrollTop: $('#' + vocationsHaveSkill[0]).offset().top - bodyTop});
				$unfolded.click();
			});
		},
		
		//レベル一括設定
		function() {
			//セレクトボックス初期化
			var $select = $('#setalllevel>select');
			for(var i = sim.LEVEL_MIN; i <= sim.LEVEL_MAX; i++) {
				$select.append($("<option />").val(i).text(i.toString()));
			}
			$select.val(sim.LEVEL_MAX);
			
			$('#setalllevel>button').button().click(function(e) {
				for(var vocation in sim.vocations) {
					sim.updateLevel(vocation, $select.val());
				}
				refreshAllVocationInfo();
				refreshTotalRequiredExp();
				refreshTotalExpRemain();
				refreshControls();
				refreshSaveUrl();
			});
		},
		
		//全スキルをリセット
		function() {
			$('#clearallskills>button').button().click(function(e) {
				if(!window.confirm('全職業のすべてのスキルを振りなおします。\n（レベル・特訓のポイントは変わりません）'))
					return;
				
				sim.clearAllSkills();
				refreshAll();
			});
		}
	];
	
	//数値を3桁区切りに整形
	function numToFormedStr(num) {
		if(isNaN(num)) return 'N/A';
		return num.toString().split(/(?=(?:\d{3})+$)/).join(',');
	}
	
	//API
	return {
		setup: setup
	};

})(jQuery);

var Base64Param = (function($) {
	//職業の内部データ順
	var VOCATIONS_DATA_ORDER = [
		'warrior',       //戦士
		'priest',        //僧侶
		'mage',          //魔法使い
		'martialartist', //武闘家
		'thief',         //盗賊
		'minstrel',      //旅芸人
		'ranger',        //レンジャー
		'paladin',       //パラディン
		'armamentalist', //魔法戦士
		'luminary',      //スーパースター
		'gladiator',     //バトルマスター
		'sage'           //賢者
	];
	
	var EN_CHAR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
	var BITS_ENCODE = 6; //6ビットごとに区切ってエンコード
	var BITS_LEVEL = 8; //レベルは8ビット確保
	var BITS_SKILL = 7; //スキルは7ビット
	var BITS_TRAINING = 7; //特訓スキルポイント7ビット
	
	var sim = Simulator;
	var isIncludingTrainingPts = false; //直前にデコードした文字列が特訓ポイントを含んでいるかどうか
	
	function encode() {
		//2進にして結合する
		var bitArray = [];
		for(var vocation in sim.vocations) {
			bitArray = bitArray.concat(numToBitArray(sim.getLevel(vocation), BITS_LEVEL));
			bitArray = bitArray.concat(numToBitArray(sim.getTrainingSkillPt(vocation), BITS_TRAINING));
			
			for(var s = 0; s < sim.vocations[vocation].skills.length; s++) {
				var skill = sim.vocations[vocation].skills[s];
				bitArray = bitArray.concat(numToBitArray(sim.getSkillPt(vocation, skill), BITS_SKILL));
			}
		}
		
		for(var i = (bitArray.length - 1) % BITS_ENCODE + 1 ; i < BITS_ENCODE; i++) bitArray.push(0); //末尾0補完
		
		var enStr = '';
		for(var i = 0; i < bitArray.length; i += BITS_ENCODE) {
			enStr += EN_CHAR.charAt(bitArrayToNum(bitArray.slice(i, i + BITS_ENCODE)));
		}
		
		return enStr;
	}
	
	function decode(str) {
		var bitArray = [];
		for(var i = 0; i < str.length; i++) {
			bitArray = bitArray.concat(numToBitArray(EN_CHAR.indexOf(str.charAt(i)), BITS_ENCODE));
		}
		
		//特訓ポイントを含むかどうか: ビット列の長さで判断
		isIncludingTrainingPts = bitArray.length >= (
			BITS_LEVEL + 
			BITS_TRAINING + 
			BITS_SKILL * sim.vocations[VOCATIONS_DATA_ORDER[0]].skills.length
		) * 10 //1.2VU（特訓モード実装）時点の職業数
		
		var paramArray = [];
		var i = 0;
		for(var vocation in sim.vocations) {
			paramArray.push(bitArrayToNum(bitArray.slice(i, i += BITS_LEVEL)) || 1);
			if(isIncludingTrainingPts)
				paramArray.push(bitArrayToNum(bitArray.slice(i, i += BITS_TRAINING)));
			else
				paramArray.push(0);
			
			for(var s in sim.vocations[vocation].skills) {
				paramArray.push(bitArrayToNum(bitArray.slice(i, i += BITS_SKILL)));
			}
		}
		
		return paramArray;
	}
	
	function applyDecodedArray(decodedArray) {
		//要素数カウント
		var count = 0;
		for(var vocation in sim.vocations) {
			count += 1; //レベル
			count += 1; //特訓ポイント
			for(var s = 0; s < sim.vocations[vocation].skills.length; s++) {
				count += 1; //各スキルポイント
			}
		}
		if(decodedArray.length != count) 
			return;
		
		var i = 0;
		for(var vocation in sim.vocations) {
			sim.updateLevel(vocation, decodedArray[i]);
			i += 1;
			sim.updateTrainingSkillPt(vocation, decodedArray[i]);
			i += 1;
			for(var s = 0; s < sim.vocations[vocation].skills.length; s++) {
				var skill = sim.vocations[vocation].skills[s];
				sim.updateSkillPt(vocation, skill, decodedArray[i]);
				i += 1;
			}
		}
	}
	
	function validate(str) {
		return str.match(/^[A-Za-z0-9-_]+$/);
	}
	
	function numToBitArray(num, digits) {
		var bitArray = [];
		for(var i = digits - 1; i >= 0; i--) {
			bitArray.push(num >> i & 1);
		}
		return bitArray;
	}
	function bitArrayToNum(bitArray) {
		var num = 0;
		for(var i = 0; i < bitArray.length; i++) {
			num = num << 1 | bitArray[i]
		}
		return num;
	}
	
	//API
	return {
		encode: encode,
		decode: decode,
		validate: validate,
		applyDecodedArray: applyDecodedArray
	};
})(jQuery);

//ロード時
jQuery(function($) {
	var query = window.location.search.substring(1);
	if(Base64Param.validate(query)) {
		var decodedArray = Base64Param.decode(query);
		if(decodedArray) {
			Base64Param.applyDecodedArray(decodedArray);
		}
	}
	
	SimulatorUI.setup();
	
	$('#tw-share').socialbutton('twitter', {
		button: 'horizontal',
		url: 'http://cpro.jp/dq10/skillsimulator/',
		lang: 'ja',
		hashtags: 'DQ10, DQX, dq10_skillsim'
	});
	$('#fb-like').socialbutton('facebook_like', {
		button: 'button_count',
		url: 'http://cpro.jp/dq10/skillsimulator/',
		locale: 'ja_JP'
	});
	$('#g-plusone').socialbutton('google_plusone', {
		lang: 'ja',
		size: 'medium',
		url: 'http://cpro.jp/dq10/skillsimulator/'
	});
});
