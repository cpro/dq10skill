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
	
	/*モンスターオブジェクト */

	//コンストラクタ
	function Monster (monsterType) {
		this.data = monsterList[monsterType];
		this.monsterType = monsterType;
		this.level = LEVEL_MIN;
		this.skillPts = {};

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
			return false;

		monsters.push(new Monster(monsterType));
	}

	//API
	return {
		addMonster: addMonster,
		monsters: monsters
	};
})();

/* UI */
var SimulatorUI = (function($) {
	var CLASSNAME_SKILL_ENABLED = 'enabled';
	var CLASSNAME_ERROR = 'error';
	
	var sim = Simulator;

	//モンスターのエントリ追加
	function drawMonsterEntry (monster) {
		var $ent = $('#monster_dummy').clone();
		$ent.find('.monstertype').text(monster.data.name);
		$ent.find('.lv_h2').text(monster.level);

		return $ent;
	}

	function refreshAll() {
		$('#monsters').empty();
		for(var i = 0; i < sim.monsters.length; i++) {
			$('#monsters').append(drawMonsterEntry(sim.monsters[i]));
		}
	}

	//API
	return {
		refreshAll: refreshAll
	};
})(jQuery);
