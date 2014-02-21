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

	var skillLines = allData.skillLines;
	var monsterList = allData.monsters;
	var skillPtsGiven = allData.skillPtsGiven;
	var expRequired = allData.expRequired;
	var additionalSkillLines = allData.additionalSkillLines;

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

		for(var s = 0; s < this.data.skillLines.length; s++) {
			this.skillPts[this.data.skillLines[s]] = 0;
		}
		//転生追加スキル
		this.additionalSkills = [];
		for(s = 0; s < ADDITIONAL_SKILL_MAX; s++) {
			this.additionalSkills[s] = null;
			this.skillPts['additional' + s.toString()] = 0;
		}
	}

	//スキルポイント取得
	Monster.prototype.getSkillPt = function(skillLine) {
		return this.skillPts[skillLine];
	};
	
	//スキルポイント更新：不正値の場合falseを返す
	Monster.prototype.updateSkillPt = function(skillLine, newValue) {
		var oldValue = this.skillPts[skillLine];
		if(newValue < SKILL_PTS_MIN || newValue > SKILL_PTS_MAX) {
			return false;
		}
		
		this.skillPts[skillLine] = newValue;
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
		for(var skillLine in this.skillPts) {
			var m = skillLine.match(/^additional(\d+)/);
			if(m && (this.restartCount < parseInt(m[1]) + 1 || this.getAdditionalSkill(m[1]) === null))
				continue;

			total += this.skillPts[skillLine];
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
		return Math.floor(expRequired[this.data.expTable][level] * (1 + this.restartCount * RESTART_EXP_RATIO));
	};
	
	//転生時の必要経験値 Lv50経験値×転生補正値の累計
	Monster.prototype.additionalExp = function() {
		var expMax = expRequired[this.data.expTable][LEVEL_MAX];
		if(isNaN(expMax)) return 0;

		var additionalExp = 0;
		for(var r = 0; r < this.restartCount; r++) {
			additionalExp += Math.floor(expMax * (1 + r * RESTART_EXP_RATIO));
		}

		return additionalExp;
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
		if(skillIndex < 0 || skillIndex > ADDITIONAL_SKILL_MAX) return false;
		
		this.additionalSkills[skillIndex] = newValue;
		return true;
	};

	//ビット数定義
	var BITS_MONSTER_TYPE = 6;
	var BITS_LEVEL = 8;
	var BITS_RESTART_COUNT = 4;
	var BITS_SKILL = 6;
	var BITS_ADDITIONAL_SKILL = 6;

	var bitDataLength =
		BITS_MONSTER_TYPE +
		BITS_LEVEL +
		BITS_RESTART_COUNT +
		BITS_SKILL * (monsterList['slime'].skillLines.length + ADDITIONAL_SKILL_MAX) +
		BITS_ADDITIONAL_SKILL * ADDITIONAL_SKILL_MAX;

	//データをビット列にシリアル化
	Monster.prototype.serialize = function() {
		var numToBitArray = Base64forBit.numToBitArray;
		var bitArray = [];

		bitArray = bitArray.concat(numToBitArray(this.data.id, BITS_MONSTER_TYPE));
		bitArray = bitArray.concat(numToBitArray(this.level, BITS_LEVEL));
		bitArray = bitArray.concat(numToBitArray(this.restartCount, BITS_RESTART_COUNT));

		//スキル
		for(var skillLine in this.skillPts)
			bitArray = bitArray.concat(numToBitArray(this.skillPts[skillLine], BITS_SKILL));

		//転生追加スキル種類
		for(var i = 0; i < ADDITIONAL_SKILL_MAX; i++) {
			var additionalSkillId = 0;

			for(var j = 0; j < additionalSkillLines.length; j++) {
				if(this.additionalSkills[i] == additionalSkillLines[j].name) {
					additionalSkillId = additionalSkillLines[j].id;
					break;
				}
			}
			bitArray = bitArray.concat(numToBitArray(additionalSkillId, BITS_ADDITIONAL_SKILL));
		}

		return bitArray;
	};

	//ビット列からデータを復元
	Monster.deserialize = function(bitArray) {
		var bitArrayToNum = Base64forBit.bitArrayToNum;
		var monster;

		var monsterTypeId = bitArrayToNum(bitArray.splice(0, BITS_MONSTER_TYPE));
		for(var monsterType in monsterList) {
			if(monsterTypeId == monsterList[monsterType].id) {
				monster = new Monster(monsterType);
				break;
			}
		}

		if(monster === undefined) return null;

		monster.updateLevel(bitArrayToNum(bitArray.splice(0, BITS_LEVEL)));
		monster.updateRestartCount(bitArrayToNum(bitArray.splice(0, BITS_RESTART_COUNT)));

		//スキル
		for(var skillLine in monster.skillPts)
			monster.updateSkillPt(skillLine, bitArrayToNum(bitArray.splice(0, BITS_SKILL)));

		//転生追加スキル種類
		for(var i = 0; i < ADDITIONAL_SKILL_MAX; i++) {
			var additionalSkillId = bitArrayToNum(bitArray.splice(0, BITS_ADDITIONAL_SKILL));

			if(additionalSkillId === 0) {
				monster.updateAdditionalSkill(i, null);
				break;
			}

			for(var j = 0; j < additionalSkillLines.length; j++) {
				if(additionalSkillId == additionalSkillLines[j].id) {
					monster.updateAdditionalSkill(i, additionalSkillLines[j].name);
					break;
				}
			}
		}

		return monster;
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
		if(i !== null) monsters.splice(i, 1);
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

	function generateQueryString() {
		var query = [];
		for(var i = 0; i < monsters.length; i++) {
			query.push(Base64forBit.encode(monsters[i].serialize()));
			query.push(Base64.encode(monsters[i].indivName, true));
		}

		return query.join(';');
	}

	function applyQueryString(queryString) {
		var query = queryString.split(';');
		while(query.length > 0) {
			var newMonster = Monster.deserialize(Base64forBit.decode(query.shift()));
			newMonster.updateIndividualName(Base64.decode(query.shift()));
			monsters.push(newMonster);
		}
	}

	function validateQueryString(queryString) {
		if(!queryString.match(/^[A-Za-z0-9-_;]+$/))
			return false;

		var query = queryString.split(';');
		if(query.length % 2 == 1)
			return false;

		for(var i = 0; i < query.length; i += 2) {
			if(query[i].length * Base64forBit.BITS_ENCODE < bitDataLength) return false;
		}

		return true;
	}

	var Base64forBit = (function() {
		var EN_CHAR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
		var BITS_ENCODE = 6; //6ビットごとに区切ってエンコード

		function encode(bitArray) {
			for(var i = (bitArray.length - 1) % BITS_ENCODE + 1 ; i < BITS_ENCODE; i++) bitArray.push(0); //末尾0補完

			var base64str = '';
			while(bitArray.length > 0) {
				base64str += EN_CHAR.charAt(bitArrayToNum(bitArray.splice(0, BITS_ENCODE)));
			}

			return base64str;
		}

		function decode(base64str) {
			var bitArray = [];
			for(var i = 0; i < base64str.length; i++) {
				bitArray = bitArray.concat(numToBitArray(EN_CHAR.indexOf(base64str.charAt(i)), BITS_ENCODE));
			}

			return bitArray;
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

		//API
		return {
			encode: encode,
			decode: decode,
			bitArrayToNum: bitArrayToNum,
			numToBitArray: numToBitArray,
			BITS_ENCODE: BITS_ENCODE
		};
	})();

	//API
	return {
		//メソッド
		addMonster: addMonster,
		getMonster: getMonster,
		deleteMonster: deleteMonster,
		movedownMonster: movedownMonster,
		moveupMonster: moveupMonster,
		generateQueryString: generateQueryString,
		applyQueryString: applyQueryString,
		validateQueryString: validateQueryString,

		//プロパティ
		skillLines: skillLines,
		skillPtsGiven: skillPtsGiven,
		expRequired: expRequired,
		monsters: monsters,
		additionalSkillLines: additionalSkillLines,

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

		var skillLine, $table;

		for(var c = 0; c < monster.data.skillLines.length; c++) {
			skillLine = monster.data.skillLines[c];
			$table = drawSkillTable(skillLine);
			
			$ent.append($table);
		}
		for(var s = 0; s < sim.ADDITIONAL_SKILL_MAX; s++) {
			skillLine = 'additional' + s.toString();
			$table = drawSkillTable(skillLine);

			if(monster.restartCount < s + 1 || monster.getAdditionalSkill(s) === null)
				$table.hide();

			$ent.append($table);
		}

		return $ent;
	}
	function drawSkillTable(skillLine) {
		var $table = $('<table />').addClass(skillLine).addClass('skill_table');
		$table.append('<caption><span class="skill_line_name">' +
			sim.skillLines[skillLine].name +
			'</span>: <span class="skill_total">0</span></caption>')
			.append('<tr><th class="console" colspan="2"><input class="ptspinner" /> <button class="reset">リセット</button></th></tr>');

		for (var s = 0; s < sim.skillLines[skillLine].skills.length; s++) {
			var skill = sim.skillLines[skillLine].skills[s];

			$('<tr />').addClass([skillLine, s].join('_'))
				.append('<td class="skill_pt">' + skill.pt + '</td>')
				.append('<td class="skill_name">' + skill.name + '</td>')
				.appendTo($table);
		}

		return $table;
	}

	function refreshEntry(monsterId) {
		refreshAdditionalSkillSelector(monsterId);
		refreshAdditionalSkill(monsterId);
		refreshMonsterInfo(monsterId);
		for(var skillLine in sim.skillLines) {
			refreshSkillList(monsterId, skillLine);
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
		var additionalExp = monster.additionalExp();
		if(additionalExp > 0)
			$('#' + monsterId + ' .exp').append('<small> + ' + numToFormedStr(additionalExp) + '</small>');

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
	
	function refreshSkillList(monsterId, skillLine) {
		$('#' + monsterId + ' tr[class^=' + skillLine + '_]').removeClass(CLASSNAME_SKILL_ENABLED); //クリア
		var monster = sim.getMonster(monsterId);

		var skillPt = monster.getSkillPt(skillLine);
		var skills = sim.skillLines[skillLine].skills;
		for(var s = 0; s < skills.length; s++) {
			if(skillPt < skills[s].pt)
				break;
			
			$('#' + monsterId + ' .' + skillLine + '_' + s.toString()).addClass(CLASSNAME_SKILL_ENABLED);
		}
		$('#' + monsterId + ' .' + skillLine + ' .skill_total').text(skillPt);
	}
	
	function refreshControls(monsterId) {
		var monster = sim.getMonster(monsterId);

		$('#' + monsterId + ' .lv_select>select').val(monster.getLevel());
		$('#' + monsterId + ' .restart_count').val(monster.getRestartCount());
		
		for(var skillLine in monster.skillPts) {
			$('#' + monsterId + ' .' + skillLine + ' .ptspinner').spinner('value', monster.getSkillPt(skillLine));
		}
	}
	
	function refreshSaveUrl() {
		var queryString = sim.generateQueryString();
		if(queryString.length === 0) {
			$('#url_text').val(url);
			$('#tw-saveurl').attr('href', '');
			return;
		}

		var url = window.location.href.replace(window.location.search, "") + '?' + queryString;
		$('#url_text').val(url);
		
		var params = {
			text: 'DQ10 仲間モンスターのスキル構成:',
			hashtags: 'DQ10, dq10_skillsim',
			url: url,
			original_referer: window.location.href,
			tw_p: 'tweetbutton'
		};
		$('#tw-saveurl').attr('href', 'https://twitter.com/intent/tweet?' + $.param(params));
	}

	function refreshAdditionalSkillSelector(monsterId) {
		var monster = sim.getMonster(monsterId);
		for(var s = 0; s < sim.ADDITIONAL_SKILL_MAX; s++) {
			$('#' + monsterId + ' .additional_skill_selector-' + s.toString()).toggle(monster.restartCount > s);
		}

		$('#' + monsterId + ' .additional_skill_selector select').empty();

		if(monster.restartCount >= 1) {
			for(s = 0; s < sim.additionalSkillLines.length; s++) {
				var additionalSkillData = sim.additionalSkillLines[s];
				var skillData = sim.skillLines[additionalSkillData.name];
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

		function refreshAdditionalSkillTable($table, newSkillLine) {
			var data = sim.skillLines[newSkillLine];
			var tableClass = $table.attr('class').split(' ')[0];

			$table.find('caption .skill_line_name').text(data.name);

			var $tr, i, skill;
			for(i = 0; i < data.skills.length; i++) {
				$tr = $table.find('tr.' + tableClass + '_' + i.toString());
				skill = data.skills[i];

				var hintText = skill.desc;
				if((skill.mp !== null) && (skill.mp !== undefined))
					hintText += '\n（消費MP: ' + skill.mp.toString() + '）';
				if(skill.gold)
					hintText += '\n（' + skill.gold.toString() + 'G）';
				$tr.attr('title', hintText);

				$tr.children('.skill_pt').text(skill.pt);
				$tr.children('.skill_name').text(skill.name);
			}
		}
	}

	function getCurrentMonsterId(currentNode) {
		return $(currentNode).parents('.monster_ent').attr('id');
	}

	function getCurrentSkillLine(currentNode) {
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
				var skillLine = getCurrentSkillLine(this);
				
				if(sim.getMonster(monsterId).updateSkillPt(skillLine, parseInt(ui.value))) {
					refreshSkillList(monsterId, skillLine);
					refreshMonsterInfo(monsterId);
					e.stopPropagation();
				} else {
					return false;
				}
			},
			change: function (e, ui) {
				var monsterId = getCurrentMonsterId(this);
				var skillLine = getCurrentSkillLine(this);
				var monster = sim.getMonster(monsterId);

				if(isNaN($(this).val())) {
					$(this).val(monster.getSkillPt(skillLine));
					return false;
				}
				if(monster.updateSkillPt(skillLine, parseInt($(this).val()))) {
					refreshSkillList(monsterId, skillLine);
					refreshMonsterInfo(monsterId);
					refreshSaveUrl();
				} else {
					$(this).val(monster.getSkillPt(skillLine));
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
			var skillLine = getCurrentSkillLine(this);
			var monster = sim.getMonster(monsterId);
			
			monster.updateSkillPt(skillLine, 0);
			$('#' + monsterId + ' .' + skillLine + ' .ptspinner').spinner('value', monster.getSkillPt(skillLine));
			refreshSkillList(monsterId, skillLine);
			refreshMonsterInfo(monsterId);
			refreshSaveUrl();
		});
		
		//スキルテーブル項目クリック時
		$ent.find('.skill_table tr[class]').click(function() {
			var monsterId = getCurrentMonsterId(this);
			var skillLine = getCurrentSkillLine(this);
			var skillIndex = parseInt($(this).attr('class').replace(skillLine + '_', ''));
			var monster = sim.getMonster(monsterId);

			var skillPt = monster.getSkillPt(skillLine);
			var requiredPt = sim.skillLines[skillLine].skills[skillIndex].pt;
			
			monster.updateSkillPt(skillLine, requiredPt);
			$('#' + monsterId + ' .' + skillLine + ' .ptspinner').spinner('value', monster.getSkillPt(skillLine));
			
			refreshSkillList(monsterId, skillLine);
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
		for(var skillLine in sim.skillLines) {
			for(var skillIndex = 0; skillIndex < sim.skillLines[skillLine].skills.length; skillIndex++) {
				var skill = sim.skillLines[skillLine].skills[skillIndex];
				var hintText = skill.desc;
				if((skill.mp !== null) && (skill.mp !== undefined))
					hintText += '\n（消費MP: ' + skill.mp.toString() + '）';
				if(skill.gold)
					hintText += '\n（' + skill.gold.toString() + 'G）';
				$('.' + skillLine + '_' + skillIndex.toString()).attr('title', hintText);
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

			refreshSaveUrl();

			if(sim.monsters.length === 0)
				$('#initial-instruction').show();
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
				refreshSaveUrl();
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
				refreshSaveUrl();
			});
		});

		//個体名テキストボックス
		$ent.find('.indiv_name input').change(function(e) {
			var monsterId = getCurrentMonsterId(this);
			var monster = sim.getMonster(monsterId);

			monster.updateIndividualName($(this).val());
			refreshSaveUrl();
		});

		//転生追加スキルセレクトボックス
		$ent.find('.additional_skill_selector select').change(function(e) {
			var monsterId = getCurrentMonsterId(this);
			var monster = sim.getMonster(monsterId);

			var selectorId = $(this).attr('id').match(/^select-additional(\d+)-/)[1];
			if(monster.updateAdditionalSkill(selectorId, $(this).val())) {
				refreshAdditionalSkill(monsterId);
				refreshMonsterInfo(monsterId);
				refreshSaveUrl();
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
			if($(this).attr('href') === '') return false;

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

			$('#initial-instruction').hide();

			$('#monsters').append(drawMonsterEntry(monster));
			setupEntry(monster.id);
			refreshEntry(monster.id);

			$('#' + monster.id + ' .indiv_name input').focus().select();
		});
	}

	function setupAll() {
		setupConsole();

		$('#monsters').empty();

		if(sim.monsters.length > 0)
			$('#initial-instruction').hide();

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
	var query = window.location.search.substring(1);
	if(Simulator.validateQueryString(query)) {
		Simulator.applyQueryString(query);
	}

	SimulatorUI.setupAll();
	
	$('#tw-share').socialbutton('twitter', {
		button: 'horizontal',
		url: 'http://cpro.jp/dq10/skillsimulator/monster.html',
		lang: 'ja',
		hashtags: 'DQ10, dq10_skillsim'
	});
	$('#fb-like').socialbutton('facebook_like', {
		button: 'button_count',
		url: 'http://cpro.jp/dq10/skillsimulator/monster.html',
		locale: 'ja_JP'
	});
	$('#g-plusone').socialbutton('google_plusone', {
		lang: 'ja',
		size: 'medium',
		url: 'http://cpro.jp/dq10/skillsimulator/monster.html'
	});
});
