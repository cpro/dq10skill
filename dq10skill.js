


var Simulator = (function($) {
	//定数
	var SKILL_PTS_MIN = 0;
	var SKILL_PTS_MAX = 100;
	var LEVEL_MIN = 1;
	var LEVEL_MAX = 60;
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
		trainingSkillPts[vocation] = 0;
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
		if(newValue > TRAINING_STAMPS_MIN && getLevel(vocation) < LEVEL_FOR_TRAINING_MODE)
			return false;
		if(newValue < TRAINING_STAMPS_MIN || newValue > TRAINING_STAMPS_MAX)
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
	
	//職業レベルに対するスキルポイント最大値
	function maxSkillPts(vocation) {
		return skillPtsGiven[levels[vocation]];
	}
	
	//スキルポイント合計に対する必要レベル取得
	function requiredLevel(vocation) {
		var total = totalSkillPts(vocation);
		for(var l = LEVEL_MIN; l <= LEVEL_MAX; l++) {
			if(skillPtsGiven[l] >= total) return l;
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
		
		//定数
		SKILL_PTS_MIN: SKILL_PTS_MIN,
		SKILL_PTS_MAX: SKILL_PTS_MAX,
		LEVEL_MIN: LEVEL_MIN,
		LEVEL_MAX: LEVEL_MAX,
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
		//見出し中のレベル数値
		$('#' + vocation + ' .lv_h2').text(sim.getLevel(vocation));
		var $levelH2 = $('#' + vocation + ' h2');
		
		//必要経験値
		$('#' + vocation + ' .exp').text(numToFormedStr(sim.requiredExp(vocation, sim.getLevel(vocation))));
		
		//スキルポイント 現在値 / 最大値
		var totalSkillPts = sim.totalSkillPts(vocation);
		var maxSkillPts = sim.maxSkillPts(vocation);
		var $skillPtsText = $('#' + vocation + ' .pts');
		$skillPtsText.text(totalSkillPts + ' / ' + maxSkillPts);
		
		//Lv不足の処理
		var isLevelError = totalSkillPts > maxSkillPts;
		
		$levelH2.toggleClass(CLASSNAME_ERROR, isLevelError);
		$skillPtsText.toggleClass(CLASSNAME_ERROR, isLevelError);
		$('#' + vocation + ' .error').toggle(isLevelError);
		if(isLevelError) {
			$('#' + vocation + ' .req_lv').text(numToFormedStr(sim.requiredLevel(vocation)));
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
			hashtags: 'DQ10, DQX',
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
			var HEIGHT_FOLDED = '2.8em';
			var HEIGHT_UNFOLDED = $('.class_group').height() + 'px';
			
			var $foldButton = $('<p>▲おりたたむ</p>').addClass('fold').hide().click(function() {
				$(this).parents('.class_group').animate({height: HEIGHT_FOLDED}).addClass('folded').removeClass('unfolded');
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
			var $foldAllButton = $('<span>▲すべておりたたむ</span>').addClass('fold').click(function() {
				$('.class_info .fold').click();
			});
			var $unfoldAllButton = $('<span>▼すべてひろげる</span>').addClass('unfold').click(function() {
				$('.class_info .unfold').click();
			});
			$('#toggle_buttons').append($foldAllButton).append($unfoldAllButton);
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
		'luminary'       //スーパースター
		/* ,
		'gladiator',     //バトルマスター
		'sage',          //賢者
		*/
	];
	
	var EN_CHAR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
	var BITS_LEVEL = 8; //レベルは8ビット確保
	var BITS_SKILL = 7; //スキルは7ビット
	
	var sim = Simulator;
	
	function encode() {
		//2進にして結合する
		var binArray = [];
		for(var vocation in sim.vocations) {
			binArray.push(numberToBin(sim.getLevel(vocation), BITS_LEVEL));
			
			for(var s = 0; s < sim.vocations[vocation].skills.length; s++) {
				var skill = sim.vocations[vocation].skills[s];
				binArray.push(numberToBin(sim.getSkillPt(vocation, skill), BITS_SKILL));
			}
		}
		
		var binStr = binArray.join('');
		for(var i = (binStr.length - 1) % 6 + 1 ; i < 6; i++) binStr += '0'; //末尾0補完
		
		var enStr = '';
		for(var i = 0; i < binStr.length; i += 6) {
			enStr += EN_CHAR.charAt(parseInt(binStr.substring(i, i + 6), 2));
		}
		
		return enStr;
	}
	
	function decode(str) {
		var binArray = [];
		for(var i = 0; i < str.length; i++) {
			binArray.push(numberToBin(EN_CHAR.indexOf(str.charAt(i)), 6));
		}
		var binStr = binArray.join('');
		
		var paramArray = [];
		var i = 0;
		for(var vocation in sim.vocations) {
			paramArray.push(parseInt(binStr.substring(i, i += 8), 2) || 1);
			
			for(var s in sim.vocations[vocation].skills) {
				paramArray.push(parseInt(binStr.substring(i, i += 7), 2) || 0);
			}
		}
		
		return paramArray;
	}
	
	function applyDecodedArray(decodedArray) {
		//要素数カウント
		var count = 0;
		for(var vocation in sim.vocations) {
			count += 1;
			for(var s = 0; s < sim.vocations[vocation].skills.length; s++) {
				count += 1;
			}
		}
		if(decodedArray.length != count) 
			return;
		
		var i = 0;
		for(var vocation in sim.vocations) {
			sim.updateLevel(vocation, decodedArray[i]);
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
	
	function numberToBin(num, digits) {
		var binStr = '';
		binStr = Number(num).toString(2);
		for(var i = binStr.length; i < digits; i++) binStr = '0' + binStr;
		return binStr;
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
		hashtags: 'DQ10, DQX'
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
