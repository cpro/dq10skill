


var Simulator = (function($) {
	//定数
	var SKILL_PTS_MIN = 0;
	var SKILL_PTS_MAX = 100;
	var LEVEL_MIN = 1;
	var LEVEL_MAX = 80;
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
			var skillCategory = vocations[vocation].skills[s];
			skillPts[vocation][skillCategory] = 0;
		}
		levels[vocation] = LEVEL_MIN;
		trainingSkillPts[vocation] = TRAINING_SKILL_PTS_MIN;
	}
	
	/* メソッド */
	//スキルポイント取得
	function getSkillPt(vocation, skillCategory) {
		return skillPts[vocation][skillCategory];
	}
	
	//スキルポイント更新：不正値の場合falseを返す
	function updateSkillPt(vocation, skillCategory, newValue) {
		var oldValue = skillPts[vocation][skillCategory];
		if(newValue < SKILL_PTS_MIN || newValue > SKILL_PTS_MAX) {
			return false;
		}
		if(totalOfSameSkills(skillCategory) - oldValue + newValue > SKILL_PTS_MAX) {
			return false;
		}
		
		skillPts[vocation][skillCategory] = newValue;
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
		for(var skillCategory in skillPts[vocation])
			total += skillPts[vocation][skillCategory];
		
		return total;
	}
	
	//同スキルのポイント合計
	function totalOfSameSkills(skillCategory) {
		var total = 0;
		for(var vocation in skillPts) {
			if(skillPts[vocation][skillCategory])
				total += skillPts[vocation][skillCategory];
		}
		return total;
	}
	
	//特定スキルすべてを振り直し（0にセット）
	function clearPtsOfSameSkills(skillCategory) {
		for(var vocation in skillPts) {
			if(skillPts[vocation][skillCategory])
				updateSkillPt(vocation, skillCategory, 0);
		}
	}
	
	//すべてのスキルを振り直し（0にセット）
	function clearAllSkills() {
		for(var vocation in skillPts) {
			for(var skillCategory in skillPts[vocation]) {
				skillPts[vocation][skillCategory] = 0;
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
	
	//特定のパッシブスキルをすべて取得済みの状態にする
	//ステータスが変動した場合trueを返す
	function presetStatus (status) {
		var returnValue = false;

		for(var vocation in vocations) {
			for(var s = 0; s < vocations[vocation].skills.length; s++) {
				var skillCategory = vocations[vocation].skills[s];

				if(!skillCategories[skillCategory].unique) continue;

				var skills = skillCategories[skillCategory].skills;
				for (var i = skills.length - 1; i >= 0; i--) {
					if(skills[i][status] && getSkillPt(vocation, skillCategory) < skills[i].pt) {
						updateSkillPt(vocation, skillCategory, skills[i].pt);
						returnValue = true;
						break;
					}
				}
			}
		}

		return returnValue;
	}

	//現在のレベルを取得スキルに対する必要レベルにそろえる
	function bringUpLevelToRequired () {
		for(var vocation in vocations) {
			if(getLevel(vocation) < requiredLevel(vocation))
				updateLevel(vocation, requiredLevel(vocation));
		}
	}

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
		'sage',          //賢者
		'monstermaster'  //まもの使い
	];

	function serialize() {
		var serialArray = [];

		for(var i = 0; i < VOCATIONS_DATA_ORDER.length; i++) {
			var vocation = VOCATIONS_DATA_ORDER[i];
			serialArray.push(String.fromCharCode(getLevel(vocation)));
			serialArray.push(String.fromCharCode(getTrainingSkillPt(vocation)));

			for(var s = 0; s < vocations[vocation].skills.length; s++) {
				var skillCategory = vocations[vocation].skills[s];
				serialArray.push(String.fromCharCode(getSkillPt(vocation, skillCategory)));
			}
		}

		return serialArray.join('');
	}
	function deserialize(serial) {
		var dataArray = [];

		for(var i = 0; i < serial.length; i++)
			dataArray.push(serial.charCodeAt(i));
		
		//要素が足りなければ0で埋める
		var expectedLength = (1 + 1 + vocations[VOCATIONS_DATA_ORDER[0]].skills.length) * VOCATIONS_DATA_ORDER.length;
		for(i = i; i < expectedLength; i++)
			dataArray.push(0);

		var cur = 0;
		for(i = 0; i < VOCATIONS_DATA_ORDER.length; i++) {
			var vocation = VOCATIONS_DATA_ORDER[i];

			updateLevel(vocation, dataArray[cur]);
			cur++;
			updateTrainingSkillPt(vocation, dataArray[cur]);
			cur++;

			for(var s = 0; s < vocations[vocation].skills.length; s++) {
				var skillCategory = vocations[vocation].skills[s];
				updateSkillPt(vocation, skillCategory, dataArray[cur]);
				cur++;
			}
		}
	}

	var BITS_LEVEL = 8; //レベルは8ビット確保
	var BITS_SKILL = 7; //スキルは7ビット
	var BITS_TRAINING = 7; //特訓スキルポイント7ビット

	function deserializeBit(serial) {
		var bitArray = [];
		for(var i = 0; i < serial.length; i++)
			bitArray = bitArray.concat(numToBitArray(serial.charCodeAt(i), 8));

		//特訓ポイントを含むかどうか: ビット列の長さで判断
		var isIncludingTrainingPts = bitArray.length >= (
			BITS_LEVEL +
			BITS_TRAINING +
			BITS_SKILL * vocations[VOCATIONS_DATA_ORDER[0]].skills.length
		) * 10; //1.2VU（特訓モード実装）時点の職業数
		
		var cur = 0;
		for(i = 0; i < VOCATIONS_DATA_ORDER.length; i++) {
			var vocation = VOCATIONS_DATA_ORDER[i];

			updateLevel(vocation, bitArrayToNum(bitArray.slice(cur, cur += BITS_LEVEL)));

			if(isIncludingTrainingPts)
				updateTrainingSkillPt(vocation, bitArrayToNum(bitArray.slice(cur, cur += BITS_TRAINING)));
			else
				updateTrainingSkillPt(vocation, 0);

			for(var s = 0; s < vocations[vocation].skills.length; s++) {
				var skillCategory = vocations[vocation].skills[s];
				updateSkillPt(vocation, skillCategory, bitArrayToNum(bitArray.slice(cur, cur += BITS_SKILL)));
			}
		}

		function bitArrayToNum(bitArray) {
			var num = 0;
			for(var i = 0; i < bitArray.length; i++) {
				num = num << 1 | bitArray[i];
			}
			return num;
		}
		function numToBitArray(num, digits) {
			var bitArray = [];
			for(var i = digits - 1; i >= 0; i--) {
				bitArray.push(num >> i & 1);
			}
			return bitArray;
		}
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
		presetStatus: presetStatus,
		bringUpLevelToRequired: bringUpLevelToRequired,
		serialize: serialize,
		deserialize: deserialize,
		deserializeBit: deserializeBit,

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

	var $ptConsole;
	
	function refreshAll() {
		refreshAllVocationInfo();
		for(var skillCategory in sim.skillCategories) {
			refreshSkillList(skillCategory);
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
	
	function refreshSkillList(skillCategory) {
		$('tr[class^=' + skillCategory + '_]').removeClass(CLASSNAME_SKILL_ENABLED); //クリア
		var totalOfSkill = sim.totalOfSameSkills(skillCategory);
		var skills = sim.skillCategories[skillCategory].skills;
		for(var s = 0; s < skills.length; s++) {
			if(totalOfSkill < skills[s].pt)
				break;
			
			$('.' + skillCategory + '_' + s.toString()).addClass(CLASSNAME_SKILL_ENABLED);
		}
		$('.' + skillCategory + ' .skill_total').text(totalOfSkill);
	}
	
	function refreshControls() {
		for(var vocation in sim.vocations) {
			$('#' + vocation + ' .lv_select>select').val(sim.getLevel(vocation));
			$('#' + vocation + ' .training_pt').val(sim.getTrainingSkillPt(vocation));
			
			for(var s = 0; s < sim.vocations[vocation].skills.length; s++) {
				var skillCategory = sim.vocations[vocation].skills[s];
				refreshCurrentSkillPt(vocation, skillCategory);
			}
		}
	}
	
	function refreshCurrentSkillPt(vocation, skillCategory) {
		$('#' + vocation + ' .' + skillCategory + ' .skill_current').text(sim.getSkillPt(vocation, skillCategory));
	}

	function refreshSaveUrl() {
		var url = window.location.href.replace(window.location.search, "") + '?' +
			Base64.btoa(RawDeflate.deflate(sim.serialize()));

		$('#url_text').val(url);
		
		var params = {
			text: 'DQ10 現在のスキル構成:',
			hashtags: 'DQ10, dq10_skillsim',
			url: url,
			original_referer: window.location.href,
			tw_p: 'tweetbutton'
		};
		$('#tw-saveurl').attr('href', 'https://twitter.com/intent/tweet?' + $.param(params));
	}
	
	function getCurrentVocation(currentNode) {
		return $(currentNode).parents('.class_group').attr('id');
	}

	function getCurrentSkillCategory(currentNode) {
		return $(currentNode).parents('.skill_table').attr('class').split(' ')[0];
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
			$('.lv_select>select').change(function() {
				var vocation = getCurrentVocation(this);
				sim.updateLevel(vocation, $(this).val());
				refreshVocationInfo(vocation);
				refreshTotalRequiredExp();
				refreshTotalExpRemain();
				refreshSaveUrl();
			});
		},
		
		//特訓ポイント選択スピンボタン設定
		function() {
			var $spinner = $('.training_pt');
			$spinner.spinner({
				min: sim.TRAINING_SKILL_PTS_MIN,
				max: sim.TRAINING_SKILL_PTS_MAX,
				spin: function (e, ui) {
					var vocation = getCurrentVocation(this);
					
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
			$ptConsole = $('#pt_console');
			var $spinner = $ptConsole.find('input');
			$spinner.spinner({
				min: sim.SKILL_PTS_MIN,
				max: sim.SKILL_PTS_MAX,
				spin: function (e, ui) {
					var vocation = getCurrentVocation(this);
					var skillCategory = getCurrentSkillCategory(this);
					
					if(sim.updateSkillPt(vocation, skillCategory, parseInt(ui.value))) {
						refreshCurrentSkillPt(vocation, skillCategory);
						refreshSkillList(skillCategory);
						refreshAllVocationInfo();
						refreshTotalExpRemain();
						refreshTotalPassive();
						e.stopPropagation();
					} else {
						return false;
					}
				},
				change: function (e, ui) {
					var vocation = getCurrentVocation(this);
					var skillCategory = getCurrentSkillCategory(this);
					
					if(isNaN($(this).val())) {
						$(this).val(sim.getSkillPt(vocation, skillCategory));
						return false;
					}
					if(sim.updateSkillPt(vocation, skillCategory, parseInt($(this).val()))) {
						refreshCurrentSkillPt(vocation, skillCategory);
						refreshSkillList(skillCategory);
						refreshAllVocationInfo();
						refreshTotalExpRemain();
						refreshTotalPassive();
						refreshSaveUrl();
					} else {
						$(this).val(sim.getSkillPt(vocation, skillCategory));
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
		
		//スキルライン名ポイント時にUI表示
		function() {
			$('.skill_table caption').hover(function(e) {
				var vocation = getCurrentVocation(this);
				var skillCategory = getCurrentSkillCategory(this);

				//位置決め
				var $baseSpan = $(this).find('.skill_current');
				var consoleLeft = $baseSpan.position().left + $baseSpan.width() - 50;
				$('#pt_reset').css({'margin-left': $(this).find('.skill_total').width() + 10});

				$ptConsole.appendTo($(this)).css({left: consoleLeft});
				$('#pt_spinner').val(sim.getSkillPt(vocation, skillCategory));

				$ptConsole.show();
			}, function(e) {
				if($(':focus').attr('id') == 'pt_spinner') return false;
				$ptConsole.hide();
			});
		},

		//リセットボタン設定
		function() {
			$reset = $ptConsole.find('button').button({
				icons: { primary: 'ui-icon-refresh' },
				text: false
			}).click(function (e) {
				var vocation = getCurrentVocation(this);
				var skillCategory = getCurrentSkillCategory(this);
				
				sim.updateSkillPt(vocation, skillCategory, 0);
				$ptConsole.find('input').val(0);
				refreshCurrentSkillPt(vocation, skillCategory);
				refreshSkillList(skillCategory);
				refreshAllVocationInfo();
				refreshTotalExpRemain();
				refreshTotalPassive();
				refreshSaveUrl();
			}).dblclick(function (e) {
				//ダブルクリック時に各職業の該当スキルをすべて振り直し
				var skillCategory = getCurrentSkillCategory(this);
				var skillName = sim.skillCategories[skillCategory].name;
				
				if(!window.confirm('スキル「' + skillName + '」をすべて振りなおします。'))
					return;
				
				sim.clearPtsOfSameSkills(skillCategory);
				$ptConsole.find('input').val(0);
				$('.' + skillCategory + ' .skill_current').text('0');
				refreshSkillList(skillCategory);
				refreshAllVocationInfo();
				refreshTotalExpRemain();
				refreshTotalPassive();
				refreshSaveUrl();
			});
		},
		
		//スキルテーブル項目クリック時
		function() {
			$('.skill_table tr[class]').click(function() {
				var vocation = getCurrentVocation(this);
				var skillCategory = getCurrentSkillCategory(this);
				var skillIndex = parseInt($(this).attr('class').replace(skillCategory + '_', ''));

				var totalPtsOfOthers = sim.totalOfSameSkills(skillCategory) - sim.getSkillPt(vocation, skillCategory);
				
				var requiredPt = sim.skillCategories[skillCategory].skills[skillIndex].pt;
				if(requiredPt < totalPtsOfOthers) return;
				
				sim.updateSkillPt(vocation, skillCategory, requiredPt - totalPtsOfOthers);
				
				refreshCurrentSkillPt(vocation, skillCategory);
				refreshSkillList(skillCategory);
				refreshAllVocationInfo();
				refreshTotalExpRemain();
				refreshTotalPassive();
				refreshSaveUrl();
			});
		},
		
		//ヒントテキスト設定
		function() {
			for(var skillCategory in sim.skillCategories) {
				for(var skillIndex = 0; skillIndex < sim.skillCategories[skillCategory].skills.length; skillIndex++) {
					var skill = sim.skillCategories[skillCategory].skills[skillIndex];
					var hintText = skill.desc;
					if((skill.mp !== null) && (skill.mp !== undefined))
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
			var HEIGHT_FOLDED = '48px';
			var HEIGHT_UNFOLDED = $('.class_group').height() + 'px';
			
			var $foldButton = $('<button>▲おりたたむ</button>').button({
				icons: { primary: 'ui-icon-triangle-1-n' },
				text: false
			}).click(function() {
				$(this).parents('.class_group')
					.animate({height: HEIGHT_FOLDED})
					.addClass('folded')
					.removeClass('unfolded');
				$(this).hide();
			}).addClass('fold').hide();

			var $unfoldButton = $('<button>▼ひろげる</button>').button({
				icons: { primary: 'ui-icon-triangle-1-s' },
				text: false
			}).click(function() {
				$(this).parents('.class_group')
					.animate({height: HEIGHT_UNFOLDED})
					.addClass('unfolded')
					.removeClass('folded');
				$(this).hide();
			}).addClass('unfold').hide();

			$('.class_group').append($foldButton).append($unfoldButton);
			$('.class_group').addClass('unfolded');
			
			//職業欄ポイント時のみ表示する
			$('.class_group').hover(function() {
				if($(this).hasClass('folded')) {
					$(this).children('.unfold').show();
				}
				if($(this).hasClass('unfolded')) {
					$(this).children('.fold').show();
				}
			}, function() {
				$(this).children('.fold, .unfold').hide();
			});
			
			//すべておりたたむ・すべてひろげるボタン追加
			$('#fold-all').click(function(e) {
				$('.fold').click();
				$('body, html').animate({scrollTop: 0});
			});
			$('#unfold-all').click(function(e) {
				$('.unfold').click();
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
			$('#clearallskills>button').button({
				icons: { primary: 'ui-icon-refresh' },
			}).click(function(e) {
				if(!window.confirm('全職業のすべてのスキルを振りなおします。\n（レベル・特訓のポイントは変わりません）'))
					return;
				
				sim.clearAllSkills();
				refreshAll();
			});
		},
		
		//hiroba-import.htmlへのリンクボタン
		function() {
			$('a#hirobaimport').button({
				icons: { primary: 'ui-icon-arrowreturnthick-1-s'}
			});
			$('a#tomonster').button({
				icons: { primary: 'ui-icon-arrowthick-1-e'}
			});
		},
		
		//スキル選択時に同スキルを強調
		function() {
			$('.skill_table').click(function(e) {
				var skillCategory = $(this).attr('class').split(' ')[0];
				$('.skill_table').removeClass('selected');
				$('.' + skillCategory).addClass('selected');
			});
		},

		//パッシブプリセット
		function() {
			//セレクトボックス初期化
			var SELECT_TABLE = [
				{val: 'pow',   text: 'ちから'},
				{val: 'def',   text: 'みのまもり'},
				{val: 'dex',   text: 'きようさ'},
				{val: 'spd',   text: 'すばやさ'},
				{val: 'magic', text: 'こうげき魔力'},
				{val: 'heal',  text: 'かいふく魔力'},
				{val: 'charm', text: 'みりょく'},
				{val: 'maxhp', text: 'さいだいHP'},
				{val: 'maxmp', text: 'さいだいMP'},
				{val: 'maxhp;maxmp', text: 'さいだいHP・MP'}
			];

			var $select = $('#preset>select');
			for(var i = 0; i < SELECT_TABLE.length; i++) {
				$select.append($("<option />").val(SELECT_TABLE[i].val).text(SELECT_TABLE[i].text));
			}
			$select.val('maxhp;maxmp');

			$('#preset>button').button().click(function(e) {
				for (var v = 0; v < $select.val().split(';').length; v++) {
					sim.presetStatus($select.val().split(';')[v]);
				}
				refreshAll();
			});
		},

		//全スキルをリセット
		function() {
			$('#bringUpLevel>button').button({
				icons: { primary: 'ui-icon-arrowthickstop-1-n' },
			}).click(function(e) {
				if(!window.confirm('全職業のレベルを現在の取得スキルに必要なところまで持ち上げます。'))
					return;
				
				sim.bringUpLevelToRequired();
				refreshAllVocationInfo();
				refreshTotalRequiredExp();
				refreshTotalExpRemain();
				refreshControls();
				refreshSaveUrl();
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


//Base64 URI safe
//[^\x00-\xFF]な文字しか来ない前提
var Base64 = (function(global) {
	var EN_CHAR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

	var _btoa_impl = function(b) {
		return b.replace(/.{1,3}/g, function(m) {
			var bits =
				(m.charCodeAt(0) << 16) |
				(m.length > 1 ? m.charCodeAt(1) << 8 : 0) |
				(m.length > 2 ? m.charCodeAt(2) : 0);
			return [
				EN_CHAR.charAt(bits >>> 18),
				EN_CHAR.charAt((bits >>> 12) & 63),
				m.length > 1 ? EN_CHAR.charAt((bits >>> 6) & 63) : '',
				m.length > 2 ? EN_CHAR.charAt(bits & 63) : ''
			].join('');
		});
	};

	var _atob_impl = function(a) {
		return a.replace(/.{1,4}/g, function(m) {
			var bits = 0;
			for(var i = 0; i < m.length; i++) {
				bits = bits | (EN_CHAR.indexOf(m.charAt(i)) << ((3 - i) * 6));
			}
			return [
				String.fromCharCode(bits >>> 16),
				m.length > 1 ? String.fromCharCode((bits >>> 8) & 0xFF) : '',
				m.length > 2 ? String.fromCharCode(bits & 0xFF) : ''
			].join('');
		});
	};

	var btoa = global.btoa ? function(b) {
		return global.btoa(b)
			.replace(/[+\/]/g, function(m0) {return m0 == '+' ? '-' : '_';})
			.replace(/=/g, '');
	} : _btoa_impl;

	var atob = global.atob ? function(a) {
		a = a.replace(/[-_]/g, function(m0) {return m0 == '-' ? '+' : '/';});
		if(a.length % 4 == 1) a += 'A';

		return global.atob(a);
	} : _atob_impl;

	function validate(str) {
		return str.match(/^[A-Za-z0-9-_]+$/);
	}

	//API
	return {
		btoa: btoa,
		atob: atob,
		validate: validate
	};
})(window);

//ロード時
jQuery(function($) {
	var query = window.location.search.substring(1);

	if(Base64.validate(query)) {
		var serial = '';

		try {
			serial = RawDeflate.inflate(Base64.atob(query));
		} catch(e) {
		}
		
		if(serial.length < 33) { //バイト数が小さすぎる場合inflate失敗とみなす。(8+7*5)*6/8=32.25
			serial = Base64.atob(query);
			Simulator.deserializeBit(serial);
		} else {
			Simulator.deserialize(serial);
		}
	}
	
	SimulatorUI.setup();
	
	$('#tw-share').socialbutton('twitter', {
		button: 'horizontal',
		url: 'http://cpro.jp/dq10/skillsimulator/',
		lang: 'ja',
		hashtags: 'DQ10, dq10_skillsim'
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
