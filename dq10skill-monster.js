var Simulator = (function() {
	var SKILL_PTS_MIN = 0;
	var SKILL_PTS_MAX = 40;
	var LEVEL_MIN = 1;
	var LEVEL_MAX = 50;
	var MONSTER_MAX = 8;
	
	var RESTART_MIN = 0;
	var RESTART_MAX = 5;
	var SKILL_PTS_PER_RESTART = 10;
	var RESTART_EXP_RATIO = 0.03; //仮数値
	var ADDITIONAL_SKILL_MAX = 2;

	var DATA_JSON_URI = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1) + 'dq10skill-monster-data.json';

	//データロード
	var allData;
	$.ajaxSetup({async: false});
	$.getJSON(DATA_JSON_URI, function(data) {
		allData = data;
	});
	$.ajaxSetup({async: true});
	
	if(!allData) return null;

	var skillCategories = allData.skillCategories;
	var monsterList = allData.monsters;
	var skillPtsGiven = allData.skillPtsGiven;
	var expRequired = allData.expRequired;
	var additionalSkillCategories = allData.additionalSkillCategories;

	//パラメータ格納用
	var skillPts = {};
	var levels = {};
	var monsters = [];
	
	//モンスターID管理
	var lastId = 0;

	/*モンスターオブジェクト */

	//コンストラクタ
	function Monster (monsterType) {
		this.data = monsterList[monsterType];
		this.monsterType = monsterType;
		this.level = LEVEL_MIN;
		this.skillPts = {};
		this.indivName = this.data.defaultName;
		this.restartCount = 0;

		this.id = monsterType + '_' + (lastId += 1).toString();

		for(var s = 0; s < this.data.skills.length; s++) {
			this.skillPts[this.data.skills[s]] = 0;
		}
		//転生追加スキル
		this.additionalSkills = [];
		for(s = 0; s < ADDITIONAL_SKILL_MAX; s++) {
			this.additionalSkills[s] = null;
		}
	}

	//スキルポイント取得
	Monster.prototype.getSkillPt = function(skillCategory) {
		return this.skillPts[skillCategory];
	};
	
	//スキルポイント更新：不正値の場合falseを返す
	Monster.prototype.updateSkillPt = function(skillCategory, newValue) {
		var oldValue = this.skillPts[skillCategory];
		if(newValue < SKILL_PTS_MIN || newValue > SKILL_PTS_MAX) {
			return false;
		}
		
		this.skillPts[skillCategory] = newValue;
		return true;
	};
	
	//レベル値取得
	Monster.prototype.getLevel = function() {
		return this.level;
	};
	
	//レベル値更新
	Monster.prototype.updateLevel = function(newValue) {
		var oldValue = this.level;
		if(newValue < LEVEL_MIN || newValue > LEVEL_MAX) {
			return oldValue;
		}
		
		this.level = newValue;
		return newValue;
	};

	//スキルポイント合計
	Monster.prototype.totalSkillPts = function() {
		var total = 0;
		for(var skillCategory in this.skillPts) {
			var m = skillCategory.match(/^additional(\d+)/);
			if(m && (this.restartCount < 1 || this.getAdditionalSkill(m[1]) === null))
				continue;

			total += this.skillPts[skillCategory];
		}

		return total;
	};
	
	//現在のレベルに対するスキルポイント最大値
	Monster.prototype.maxSkillPts = function() {
		return skillPtsGiven[this.level];
	};
	
	//スキルポイント合計に対する必要レベル取得
	Monster.prototype.requiredLevel = function() {
		var restartSkillPt = this.getRestartSkillPt();
		var total = this.totalSkillPts() - restartSkillPt;
		
		for(var l = LEVEL_MIN; l <= LEVEL_MAX; l++) {
			if(skillPtsGiven[l] >= total)
				return l;
		}
		return NaN;
	};
	
	//モンスター・レベルによる必要経験値
	Monster.prototype.requiredExp = function(level) {
		var expMax = expRequired[this.data.expTable][LEVEL_MAX];
		if(isNaN(expMax)) expMax = 0;
		var additionalExp = 0;
		for(var r = 0; r < this.restartCount; r++) {
			additionalExp += expMax * Math.floor(1 + r * RESTART_EXP_RATIO);
		}

		return expRequired[this.data.expTable][level] * Math.floor(1 + this.restartCount * RESTART_EXP_RATIO) + additionalExp;
	};
	
	//不足経験値
	Monster.prototype.requiredExpRemain = function() {
		var required = this.requiredLevel();
		if(required <= this.level) return 0;
		var remain = this.requiredExp(required) - this.requiredExp(this.level);
		return remain;
	};

	//個体名の取得
	Monster.prototype.getIndividualName = function() {
		return this.indivName;
	};
	//個体名の更新
	Monster.prototype.updateIndividualName = function(newName) {
		this.indivName = newName;
	};

	//転生回数の取得
	Monster.prototype.getRestartCount = function() {
		return this.restartCount;
	};
	//転生回数の更新
	Monster.prototype.updateRestartCount = function(newValue) {
		if(newValue < RESTART_MIN || newValue > RESTART_MAX) {
			return false;
		}
		
		this.restartCount = newValue;
		return true;
	};
	//転生による追加スキルポイントの取得
	Monster.prototype.getRestartSkillPt = function() {
		return this.restartCount * SKILL_PTS_PER_RESTART;
	};

	//転生追加スキルの取得
	Monster.prototype.getAdditionalSkill = function(skillIndex) {
		return this.additionalSkills[skillIndex];
	};
	//転生追加スキルの更新
	Monster.prototype.updateAdditionalSkill = function(skillIndex, newValue) {
		if(skillIndex > ADDITIONAL_SKILL_MAX) return false;

		if(newValue !== null) {
			for(var i = 0; i < this.additionalSkills.length; i++) {
				if(i == skillIndex) continue;
				if(newValue == this.additionalSkills[i]) return false;
			}
		}
		
		this.additionalSkills[skillIndex] = newValue;
		return true;
	};

	/* メソッド */

	//モンスター追加
	function addMonster (monsterType) {
		if(monsters.length >= MONSTER_MAX)
			return null;

		var newMonster = new Monster(monsterType);
		monsters.push(newMonster);
		return newMonster;
	}

	//IDからモンスター取得
	function getMonster(monsterId) {
		return monsters[indexOf(monsterId)];
	}

	//指定IDのモンスター削除
	function deleteMonster(monsterId) {
		var i = indexOf(monsterId);
		if(i) monsters.splice(i, 1);
	}

	//指定IDのモンスターをひとつ下に並び替える
	function movedownMonster(monsterId) {
		var i = indexOf(monsterId);
		if(i > monsters.length) return;

		monsters.splice(i, 2, monsters[i + 1], monsters[i]);
	}

	//指定IDのモンスターをひとつ上に並び替える
	function moveupMonster(monsterId) {
		var i = indexOf(monsterId);
		if(i < 0) return;
		
		monsters.splice(i - 1, 2, monsters[i], monsters[i - 1]);
	}

	function indexOf(monsterId) {
		for(var i = 0; i < monsters.length; i++) {
			if(monsters[i].id == monsterId) return i;
		}
		return null;
	}

	//API
	return {
		//メソッド
		addMonster: addMonster,
		getMonster: getMonster,
		deleteMonster: deleteMonster,
		movedownMonster: movedownMonster,
		moveupMonster : moveupMonster,

		//プロパティ
		skillCategories: skillCategories,
		skillPtsGiven: skillPtsGiven,
		expRequired: expRequired,
		monsters: monsters,
		additionalSkillCategories: additionalSkillCategories,

		//定数
		SKILL_PTS_MIN: SKILL_PTS_MIN,
		SKILL_PTS_MAX: SKILL_PTS_MAX,
		LEVEL_MIN: LEVEL_MIN,
		LEVEL_MAX: LEVEL_MAX,
		RESTART_MIN: RESTART_MIN,
		RESTART_MAX: RESTART_MAX,
		ADDITIONAL_SKILL_MAX: ADDITIONAL_SKILL_MAX
	};
})();

/* UI */
var SimulatorUI = (function($) {
	var CLASSNAME_SKILL_ENABLED = 'enabled';
	var CLASSNAME_ERROR = 'error';
	
	var sim = Simulator;

	//モンスターのエントリ追加
	function drawMonsterEntry (monster) {
		var $ent = $('#monster_dummy').clone()
			.attr('id', monster.id)
			.css('display', 'block');
		$ent.find('.monstertype').text(monster.data.name);
		$ent.find('[id$=-dummy]').each(function() {
			var dummyId = $(this).attr('id');
			var newId = dummyId.replace('-dummy', '-' + monster.id);

			$(this).attr('id', newId);
			$ent.find('label[for=' + dummyId + ']').attr('for', newId);
		});
		$ent.find('.indiv_name input').val(monster.indivName);

		for(var c = 0; c < monster.data.skills.length; c++) {
			var skillCategory = monster.data.skills[c];
			$table = drawSkillTable(skillCategory);

			var m = skillCategory.match(/^additional(\d+)$/);
			if(m && (monster.restartCount < 1 || monster.getAdditionalSkill(m[1]) === null)) {
				$table.hide();
			}
			
			$ent.append($table);
		}


		return $ent;
	}
	function drawSkillTable(skillCategory) {
		var $table = $('<table />').addClass(skillCategory).addClass('skill_table');
		$table.append('<caption><span class="skill_category_name">' +
			sim.skillCategories[skillCategory].name +
			'</span>: <span class="skill_total">0</span></caption>')
			.append('<tr><th class="console" colspan="2"><input class="ptspinner" /> <button class="reset">リセット</button></th></tr>');

		for (var s = 0; s < sim.skillCategories[skillCategory].skills.length; s++) {
			var skill = sim.skillCategories[skillCategory].skills[s];

			$('<tr />').addClass([skillCategory, s].join('_'))
				.append('<td class="skill_pt">' + skill.pt + '</td>')
				.append('<td class="skill_name">' + skill.name + '</td>')
				.appendTo($table);
		}

		return $table;
	}

	function refreshEntry(monsterId) {
		refreshAdditionalSkillSelector(monsterId);
		refreshMonsterInfo(monsterId);
		for(var skillCategory in sim.skillCategories) {
			refreshSkillList(monsterId, skillCategory);
		}
		refreshControls(monsterId);
		refreshSaveUrl();
	}

	function refreshAll() {
		for(var i = 0; i < sim.monsters.length; i++) {
			refreshEntry(sim.monsters[i].id);
		}
	}

	function refreshMonsterInfo(monsterId) {
		var monster = sim.getMonster(monsterId);
		var currentLevel = monster.getLevel();
		var requiredLevel = monster.requiredLevel();
		
		//見出し中のレベル数値
		$('#' + monsterId + ' .lv_h2').text(currentLevel);
		if(monster.getRestartCount() > 0)
			$('#' + monsterId + ' .lv_h2').append('<small> + ' + monster.getRestartCount() + '</small>');

		var $levelH2 = $('#' + monsterId + ' h2');
		
		//必要経験値
		$('#' + monsterId + ' .exp').text(numToFormedStr(monster.requiredExp(currentLevel)));
		
		//スキルポイント 残り / 最大値
		var maxSkillPts = monster.maxSkillPts();
		var additionalSkillPts = monster.getRestartSkillPt();
		var remainingSkillPts = maxSkillPts + additionalSkillPts - monster.totalSkillPts();
		var $skillPtsText = $('#' + monsterId + ' .pts');
		$skillPtsText.text(remainingSkillPts + ' / ' + maxSkillPts);
		if(additionalSkillPts > 0)
			$skillPtsText.append('<small> + ' + additionalSkillPts + '</small>');
		
		//Lv不足の処理
		var isLevelError = (isNaN(requiredLevel) || currentLevel < requiredLevel);
		
		$levelH2.toggleClass(CLASSNAME_ERROR, isLevelError);
		$skillPtsText.toggleClass(CLASSNAME_ERROR, isLevelError);
		$('#' + monsterId + ' .error').toggle(isLevelError);
		if(isLevelError) {
			$('#' + monsterId + ' .req_lv').text(numToFormedStr(requiredLevel));
			$('#' + monsterId + ' .exp_remain').text(numToFormedStr(monster.requiredExpRemain()));
		}
	}
	
	function refreshSkillList(monsterId, skillCategory) {
		$('#' + monsterId + ' tr[class^=' + skillCategory + '_]').removeClass(CLASSNAME_SKILL_ENABLED); //クリア
		var monster = sim.getMonster(monsterId);

		var skillPt = monster.getSkillPt(skillCategory);
		var skills = sim.skillCategories[skillCategory].skills;
		for(var s = 0; s < skills.length; s++) {
			if(skillPt < skills[s].pt)
				break;
			
			$('#' + monsterId + ' .' + skillCategory + '_' + s.toString()).addClass(CLASSNAME_SKILL_ENABLED);
		}
		$('#' + monsterId + ' .' + skillCategory + ' .skill_total').text(skillPt);
	}
	
	function refreshControls(monsterId) {
		var monster = sim.getMonster(monsterId);

		$('#' + monsterId + ' .lv_select>select').val(monster.getLevel());
		$('#' + monsterId + ' .restart_count').val(monster.getRestartCount());
		
		for(var s = 0; s < monster.data.skills.length; s++) {
			var skillCategory = monster.data.skills[s];
			$('#' + monsterId + ' .' + skillCategory + ' .ptspinner').spinner('value', monster.getSkillPt(skillCategory));
		}
	}
	
	function refreshSaveUrl() { /*
		var url = window.location.href.replace(window.location.search, "") + '?' + Base64Param.encode();
		$('#url_text').val(url);
		
		var params = {
			text: 'DQ10 V2のスキル構成予定:',
			hashtags: 'DQ10, dq10_skillsim',
			url: url,
			original_referer: window.location.href,
			tw_p: 'tweetbutton'
		};
		$('#tw-saveurl').attr('href', 'https://twitter.com/intent/tweet?' + $.param(params)); */
	}

	function refreshAdditionalSkillSelector(monsterId) {
		var monster = sim.getMonster(monsterId);
		for(var s = 0; s < sim.ADDITIONAL_SKILL_MAX; s++) {
			$('#' + monsterId + ' .additional_skill_selector-' + s.toString()).toggle(monster.restartCount > s);
		}

		$('#' + monsterId + ' .additional_skill_selector select').empty();

		if(monster.restartCount >= 1) {
			for(s = 0; s < sim.additionalSkillCategories.length; s++) {
				var additionalSkillData = sim.additionalSkillCategories[s];
				var skillData = sim.skillCategories[additionalSkillData.name];
				if(monster.restartCount >= additionalSkillData.restartCount) {
					$('#' + monsterId + ' .additional_skill_selector select').append(
						$('<option />').val(additionalSkillData.name).text(skillData.name)
					);
				}
			}
		}

		for(s = 0; s < sim.ADDITIONAL_SKILL_MAX; s++) {
			$('#' + monsterId + ' .additional_skill_selector-' + s.toString() + ' select').val(monster.getAdditionalSkill(s));
		}
	}

	function refreshAdditionalSkill(monsterId) {
		var monster = sim.getMonster(monsterId);
		var $table;

		for(var s = 0; s < sim.ADDITIONAL_SKILL_MAX; s++) {
			$table = $('#' + monsterId + ' .additional' + s.toString());
			if(monster.restartCount >= s + 1 && monster.getAdditionalSkill(s) !== null) {
				refreshAdditionalSkillTable($table, monster.getAdditionalSkill(s));
				$table.show();
			} else {
				$table.hide();
			}
		}

		function refreshAdditionalSkillTable($table, newSkillCategory) {
			var data = sim.skillCategories[newSkillCategory];

			$table.find('caption .skill_category_name').text(data.name);

			var $tr;
			for(var s = 0; s < data.skills.length; s++) {
				$tr = $table.find('tr[class$=_' + s.toString() + ']');

				var hintText = data.skills[s].desc;
				if((data.skills[s].mp !== null) && (data.skills[s].mp !== undefined))
					hintText += '\n（消費MP: ' + data.skills[s].mp.toString() + '）';
				if(data.skills[s].gold)
					hintText += '\n（' + data.skills[s].gold.toString() + 'G）';
				$tr.attr('title', hintText);

				$tr.children('.skill_pt').text(data.skills[s].pt);
				$tr.children('.skill_name').text(data.skills[s].name);
			}
		}
	}

	function getCurrentMonsterId(currentNode) {
		return $(currentNode).parents('.monster_ent').attr('id');
	}

	function getCurrentSkillCategory(currentNode) {
		return $(currentNode).parents('.skill_table').attr('class').split(' ')[0];
	}

	function setupEntry(monsterId) {
		var $ent = $('#' + monsterId);

		//レベル選択セレクトボックス項目設定
		var $select = $ent.find('.lv_select>select');
		for(var i = sim.LEVEL_MIN; i <= sim.LEVEL_MAX; i++) {
			$select.append($("<option />").val(i).text(i.toString() + ' (' + sim.skillPtsGiven[i].toString() + ')'));
		}
		//レベル選択セレクトボックス変更時
		$select.change(function() {
			var monsterId = getCurrentMonsterId(this);
			sim.getMonster(monsterId).updateLevel($(this).val());
			refreshMonsterInfo(monsterId);
			//refreshSaveUrl();
		});

		//レベル転生回数スピンボタン設定
		var $spinner = $ent.find('.restart_count');
		$spinner.spinner({
			min: sim.RESTART_MIN,
			max: sim.RESTART_MAX,
			spin: function (e, ui) {
				var monsterId = getCurrentMonsterId(this);
				var monster = sim.getMonster(monsterId);

				if(monster.updateRestartCount(parseInt(ui.value))) {
					refreshAdditionalSkillSelector(monsterId);
					refreshAdditionalSkill(monsterId);
					refreshMonsterInfo(monsterId);
				} else {
					return false;
				}
			},
			change: function (e, ui) {
				var monsterId = getCurrentMonsterId(this);
				var monster = sim.getMonster(monsterId);
				
				if(isNaN($(this).val())) {
					$(this).val(monster.getRestartCount());
					return false;
				}
				if(monster.updateRestartCount(parseInt($(this).val()))) {
					refreshAdditionalSkillSelector(monsterId);
					refreshAdditionalSkill(monsterId);
					refreshMonsterInfo(monsterId);
					refreshSaveUrl();
				} else {
					$(this).val(monster.getRestartCount());
					return false;
				}
			},
			stop: function (e, ui) {
				refreshSaveUrl();
			}
		});

		//スピンボタン設定
		$spinner = $ent.find('.ptspinner');
		$spinner.spinner({
			min: sim.SKILL_PTS_MIN,
			max: sim.SKILL_PTS_MAX,
			spin: function (e, ui) {
				var monsterId = getCurrentMonsterId(this);
				var skillCategory = getCurrentSkillCategory(this);
				
				if(sim.getMonster(monsterId).updateSkillPt(skillCategory, parseInt(ui.value))) {
					refreshSkillList(monsterId, skillCategory);
					refreshMonsterInfo(monsterId);
					e.stopPropagation();
				} else {
					return false;
				}
			},
			change: function (e, ui) {
				var monsterId = getCurrentMonsterId(this);
				var skillCategory = getCurrentSkillCategory(this);
				var monster = sim.getMonster(monsterId);

				if(isNaN($(this).val())) {
					$(this).val(monster.getSkillPt(skillCategory));
					return false;
				}
				if(monster.updateSkillPt(skillCategory, parseInt($(this).val()))) {
					refreshSkillList(monsterId, skillCategory);
					refreshMonsterInfo(monsterId);
					refreshSaveUrl();
				} else {
					$(this).val(monster.getSkillPt(skillCategory));
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

		//リセットボタン設定
		$reset = $ent.find('.reset').button({
			icons: { primary: 'ui-icon-refresh' },
			text: false
		}).click(function (e) {
			var monsterId = getCurrentMonsterId(this);
			var skillCategory = getCurrentSkillCategory(this);
			var monster = sim.getMonster(monsterId);
			
			monster.updateSkillPt(skillCategory, 0);
			$('#' + monsterId + ' .' + skillCategory + ' .ptspinner').spinner('value', monster.getSkillPt(skillCategory));
			refreshSkillList(monsterId, skillCategory);
			refreshMonsterInfo(monsterId);
			refreshSaveUrl();
		});
		
		//スキルテーブル項目クリック時
		$ent.find('.skill_table tr[class]').click(function() {
			var monsterId = getCurrentMonsterId(this);
			var skillCategory = getCurrentSkillCategory(this);
			var skillIndex = parseInt($(this).attr('class').replace(skillCategory + '_', ''));
			var monster = sim.getMonster(monsterId);

			var skillPt = monster.getSkillPt(skillCategory);
			var requiredPt = sim.skillCategories[skillCategory].skills[skillIndex].pt;
			
			monster.updateSkillPt(skillCategory, requiredPt);
			$('#' + monsterId + ' .' + skillCategory + ' .ptspinner').spinner('value', monster.getSkillPt(skillCategory));
			
			refreshSkillList(monsterId, skillCategory);
			refreshMonsterInfo(monsterId);
			refreshSaveUrl();
		});

		//おりたたむ・ひろげるボタン追加
		var HEIGHT_FOLDED = '4.8em';
		var HEIGHT_UNFOLDED = $ent.find('.monster_ent').height() + 'px';
		if($ent.hasClass('monster_ent'))
			HEIGHT_UNFOLDED = $ent.height() + 'px';

		var $foldButton = $('<p>▲おりたたむ</p>').addClass('fold').hide().click(function() {
			$(this).parents('.monster_ent').animate({height: HEIGHT_FOLDED}).addClass('folded').removeClass('unfolded');
			$(this).hide();
		});
		var $unfoldButton = $('<p>▼ひろげる</p>').addClass('unfold').hide().click(function() {
			$(this).parents('.monster_ent').animate({height: HEIGHT_UNFOLDED}).addClass('unfolded').removeClass('folded');
			$(this).hide();
		});
		$ent.find('.class_info').append($foldButton).append($unfoldButton);
		$ent.find('.monster_ent').addClass('unfolded');
		if($ent.hasClass('monster_ent')) $ent.addClass('unfolded');

		//ヒントテキスト設定
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
		
		//職業情報欄ポイント時のみ表示する
		$ent.find('.class_info').hover(function() {
			if($(this).parents('.monster_ent').hasClass('folded')) {
				$(this).children('.unfold').show();
			}
			if($(this).parents('.monster_ent').hasClass('unfolded')) {
				$(this).children('.fold').show();
			}
		}, function() {
			$(this).children('.fold, .unfold').hide();
		});

		//削除ボタン
		$ent.find('.delete_entry').button({
			icons: { primary: 'ui-icon-close' },
			text: false
		}).click(function (e) {
			var monsterId = getCurrentMonsterId(this);
			var monster = sim.getMonster(monsterId);

			var additionalLevel = '';
			if(monster.getRestartCount() > 0)
				additionalLevel = '(+' + monster.getRestartCount() + ')';

			var message = monster.data.name +
				' Lv' + monster.getLevel().toString() + additionalLevel +
				'「' + monster.getIndividualName() +
				'」を削除します。よろしいですか？';
			if(!window.confirm(message)) return;

			sim.deleteMonster(monsterId);
			$('#' + monsterId).remove();
		});

		//下へボタン
		$ent.find('.movedown').button({
			icons: { primary: 'ui-icon-triangle-1-s' },
			text: false
		}).click(function (e) {
			var monsterId = getCurrentMonsterId(this);
			var $ent = $('#' + monsterId);

			if($ent.next().length === 0) return;

			var zIndex = $ent.css('z-index');
			var pos = $ent.position();

			$ent.css({position: 'absolute', top: pos.top, left: pos.left, 'z-index': 1});
			$ent.animate({top: $ent.next().position().top + $ent.next().height()}, function() {
				$ent.insertAfter($ent.next());
				$ent.css({position: 'relative', top: 0, left: 0, 'z-index': zIndex});
				sim.movedownMonster(monsterId);
			});
		});
		//上へボタン
		$ent.find('.moveup').button({
			icons: { primary: 'ui-icon-triangle-1-n' },
			text: false
		}).click(function (e) {
			var monsterId = getCurrentMonsterId(this);
			var $ent = $('#' + monsterId);

			if($ent.prev().length === 0) return;

			var zIndex = $ent.css('z-index');
			var pos = $ent.position();

			$ent.css({position: 'absolute', top: pos.top, left: pos.left, 'z-index': 1});
			$ent.animate({top: $ent.prev().position().top}, function() {
				$ent.insertBefore($ent.prev());
				$ent.css({position: 'relative', top: 0, left: 0, 'z-index': zIndex});
				sim.moveupMonster(monsterId);
			});
		});

		//個体名テキストボックス
		$ent.find('.indiv_name input').change(function(e) {
			var monsterId = getCurrentMonsterId(this);
			var monster = sim.getMonster(monsterId);

			monster.updateIndividualName($(this).val());
		});

		//転生追加スキルセレクトボックス
		$ent.find('.additional_skill_selector select').change(function(e) {
			var monsterId = getCurrentMonsterId(this);
			var monster = sim.getMonster(monsterId);

			var selectorId = $(this).attr('id').match(/^select-additional(\d+)-/)[1];
			if(monster.updateAdditionalSkill(selectorId, $(this).val())) {
				refreshAdditionalSkill(monsterId);
			} else {
				$(this).val(monster.getAdditionalSkill(selectorId));
				return false;
			}
		});
	}

	function setupConsole() {
		//URLテキストボックスクリック時
		$('#url_text').click(function() {
			$(this).select();
		});

		//保存用URLツイートボタン設定
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

		//すべておりたたむ・すべてひろげるボタン追加
		$('#fold-all').click(function(e) {
			$('.class_info .fold').click();
			$('body, html').animate({scrollTop: 0});
		});
		$('#unfold-all').click(function(e) {
			$('.class_info .unfold').click();
			$('body, html').animate({scrollTop: 0});
		});

		//レベル一括設定
		//セレクトボックス初期化
		$select = $('#setalllevel>select');
		for(i = sim.LEVEL_MIN; i <= sim.LEVEL_MAX; i++) {
			$select.append($("<option />").val(i).text(i.toString()));
		}
		$select.val(sim.LEVEL_MAX);
		
		$('#setalllevel>button').button().click(function(e) {
			for(i = 0; i < sim.monsters.length; i++) {
				sim.monsters[i].updateLevel($select.val());
			}
			refreshAll();
		});

		$('#appendbuttons a').click(function(e) {
			var monsterType = $(this).attr('id').replace('append-', '');
			var monster = sim.addMonster(monsterType);
			if(monster === null) return;

			$('#monsters').append(drawMonsterEntry(monster));
			setupEntry(monster.id);
			refreshEntry(monster.id);

			$('#' + monster.id + ' .indiv_name input').focus().select();
		});
	}

	function setupAll() {
		setupConsole();

		$('#monsters').empty();
		for(var i = 0; i < sim.monsters.length; i++) {
			$('#monsters').append(drawMonsterEntry(sim.monsters[i]));
		}
		setupEntry('monsters');

		refreshAll();
	}

	//数値を3桁区切りに整形
	function numToFormedStr(num) {
		if(isNaN(num)) return 'N/A';
		return num.toString().split(/(?=(?:\d{3})+$)/).join(',');
	}

	//API
	return {
		setupAll: setupAll
	};
})(jQuery);

//ロード時
jQuery(function($) {
	//テスト用コード
	Simulator.addMonster('prisonyan');
	Simulator.addMonster('slime');
	SimulatorUI.setupAll();
	
	$('#tw-share').socialbutton('twitter', {
		button: 'horizontal',
		url: 'http://cpro.jp/dq10/skillsimulator/beta/monster.html',
		lang: 'ja',
		hashtags: 'DQ10, dq10_skillsim'
	});
	$('#fb-like').socialbutton('facebook_like', {
		button: 'button_count',
		url: 'http://cpro.jp/dq10/skillsimulator/beta/monster.html',
		locale: 'ja_JP'
	});
	$('#g-plusone').socialbutton('google_plusone', {
		lang: 'ja',
		size: 'medium',
		url: 'http://cpro.jp/dq10/skillsimulator/beta/monster.html'
	});
});
