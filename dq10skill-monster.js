var Simulator = (function() {
	var SKILL_PTS_MIN = 0;
	var SKILL_PTS_MAX = 40;
	var LEVEL_MIN = 1;
	var LEVEL_MAX = 30;
	var MONSTER_MAX = 8;

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

		this.id = monsterType + '_' + (lastId += 1).toString();

		for(var s = 0; s < this.data.skills.length; s++) {
			this.skillPts[this.data.skills[s]] = 0;
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
		for(var skillCategory in this.skillPts)
			total += this.skillPts[skillCategory];
		
		return total;
	};
	
	//現在のレベルに対するスキルポイント最大値
	Monster.prototype.maxSkillPts = function() {
		return skillPtsGiven[this.level];
	};
	
	//スキルポイント合計に対する必要レベル取得
	Monster.prototype.requiredLevel = function() {
		var total = this.totalSkillPts();
		
		for(var l = LEVEL_MIN; l <= LEVEL_MAX; l++) {
			if(skillPtsGiven[l] >= total)
				return l;
		}
		return NaN;
	};
	
	//モンスター・レベルによる必要経験値
	Monster.prototype.requiredExp = function(level) {
		return expRequired[this.data.expTable][level];
	};
	
	//不足経験値
	Monster.prototype.requiredExpRemain = function() {
		var required = this.requiredLevel();
		if(required <= this.level) return 0;
		var remain = this.requiredExp(required) - this.requiredExp(this.level);
		return remain;
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
		for(var i = 0; i < monsters.length; i++) {
			if(monsters[i].id == monsterId) return monsters[i];
		}
		return null;
	}

	//指定IDのモンスター削除
	function deleteMonster(monsterId) {
		for(var i = 0; i < monsters.length; i++) {
			if(monsters[i].id == monsterId) monsters.splice(i, 1);
		}
	}
	//API
	return {
		//メソッド
		addMonster: addMonster,
		getMonster: getMonster,
		deleteMonster: deleteMonster,

		//プロパティ
		skillCategories: skillCategories,
		skillPtsGiven: skillPtsGiven,
		expRequired: expRequired,
		monsters: monsters,
		
		//定数
		SKILL_PTS_MIN: SKILL_PTS_MIN,
		SKILL_PTS_MAX: SKILL_PTS_MAX,
		LEVEL_MIN: LEVEL_MIN,
		LEVEL_MAX: LEVEL_MAX
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
		$ent.find('#lv-dummy').attr('id', 'lv-' + monster.id);
		$ent.find('.label_lv label').attr('for', 'lv-' + monster.id);

		for(var c = 0; c < monster.data.skills.length; c++) {
			var skillCategory = monster.data.skills[c];

			var $table = $('<table />').addClass(skillCategory).addClass('skill_table');
			$table.append('<caption>' +
				sim.skillCategories[skillCategory].name +
				': <span class="skill_total">0</span></caption>')
				.append('<tr><th class="console" colspan="2"><input class="ptspinner" /><button class="reset">リセット</button></th></tr>');

			for (var s = 0; s < sim.skillCategories[skillCategory].skills.length; s++) {
				var skill = sim.skillCategories[skillCategory].skills[s];

				var $trSkill = $('<tr />').addClass([skillCategory, s].join('_'))
					.append('<td class="skill_pt">' + skill.pt + '</td>')
					.append('<td class="skill_name">' + skill.name + '</td>')
					.appendTo($table);
			}

			$ent.append($table);
		}

		return $ent;
	}

	function refreshEntry(monsterId) {
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
		var $levelH2 = $('#' + monsterId + ' h2');
		
		//必要経験値
		$('#' + monsterId + ' .exp').text(numToFormedStr(monster.requiredExp(currentLevel)));
		
		//スキルポイント 残り / 最大値
		var maxSkillPts = monster.maxSkillPts();
		var remainingSkillPts = maxSkillPts - monster.totalSkillPts();
		var $skillPtsText = $('#' + monsterId + ' .pts');
		$skillPtsText.text(remainingSkillPts + ' / ' + maxSkillPts);
		
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
		var HEIGHT_FOLDED = '2.5em';
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

			if(!window.confirm(monster.data.name + ' Lv' + monster.getLevel().toString() + ' を削除します。よろしいですか？')) return;

			sim.deleteMonster(monsterId);
			$('#' + monsterId).remove();
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
});
