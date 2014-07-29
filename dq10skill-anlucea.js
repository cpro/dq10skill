(function($) {
	var Simulator = (function() {
		//定数
		var SKILL_PTS_MIN = 0;
		var SKILL_PTS_MAX = 40;
		var LEVEL_MIN = 20;
		var LEVEL_MAX = 50;

		var DATA_JSON_URI = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1) + 'dq10skill-anlucea-data.json';
		
		//データロード
		var allData;
		$.ajaxSetup({async: false});
		$.getJSON(DATA_JSON_URI, function(data) {
			allData = data;
		});
		$.ajaxSetup({async: true});
		
		if(!allData) return null;
		
		var skillLines = allData.skillLines;
		var skillPtsGiven = allData.skillPtsGiven;
		var expRequired = allData.expRequired;
		
		//パラメータ格納用
		var skillPts = {};
		var level = LEVEL_MIN;

		//パラメータ初期化
		for(var skillLine in skillLines) {
			skillPts[skillLine] = 0;
		}
		
		/* メソッド */
		//スキルポイント取得
		function getSkillPt(skillLine) {
			return skillPts[skillLine];
		}
		
		//スキルポイント更新：不正値の場合falseを返す
		function updateSkillPt(skillLine, newValue) {
			var oldValue = skillPts[skillLine];
			if(newValue < SKILL_PTS_MIN || newValue > SKILL_PTS_MAX) {
				return false;
			}
			
			skillPts[skillLine] = newValue;
			return true;
		}
		
		//レベル値取得
		function getLevel(vocation) {
			return level;
		}
		
		//レベル値更新
		function updateLevel(vocation, newValue) {
			var oldValue = level;
			if(newValue < LEVEL_MIN || newValue > LEVEL_MAX) {
				return oldValue;
			}
			
			level = newValue;
			return newValue;
		}

		//使用済みスキルポイント合計
		function totalSkillPts() {
			var total = 0;
			for(var skillLine in skillLines)
				total += skillPts[skillLine];
			
			return total;
		}
		
		//すべてのスキルを振り直し（0にセット）
		function clearAllSkills() {
			for(var skillLine in skillLines) {
				skillPts[skillLine] = 0;
			}
		}
		
		//レベルに対するスキルポイント最大値
		function maxSkillPts() {
			return skillPtsGiven[level];
		}
		
		//スキルポイント合計に対する必要レベル取得
		function requiredLevel() {
			var total = totalSkillPts();
			
			for(var l = LEVEL_MIN; l <= LEVEL_MAX; l++) {
				if(skillPtsGiven[l] >= total)
					return l;
			}
			return NaN;
		}
		
		//レベルによる必要経験値
		function requiredExp(level) {
			return expRequired[level];
		}
		
		//不足経験値
		function requiredExpRemain() {
			var required = requiredLevel();
			if(required <= level) return 0;
			var remain = requiredExp(required) - requiredExp(level);
			return remain;
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
			//スキルラインデータの各スキルから上記プロパティを調べ合計する
			var total = 0;
			var skills;
			for(var skillLine in skillLines) {
				skills = skillLines[skillLine].skills;
				for(var i = 0; i < skills.length; i++) {
					if(skillPts[skillLine] < skills[i].pt)
						break;
					
					if(skills[i][status])
						total += skills[i][status];
				}
			}
			
			return total;
		}

		//現在のレベルを取得スキルに対する必要レベルにそろえる
		function bringUpLevelToRequired () {
			if(getLevel() < requiredLevel())
				updateLevel(requiredLevel());
		}

		function serialize() {
			var serial = '';
			var toByte = String.fromCharCode;

			serial += toByte(getLevel());

			for(var skillLine in skillLines) {
				serial += toByte(getSkillPt(skillLine));
			}

			return serial;
		}
		function deserialize(serial) {
			var cur = 0;
			var getData = function() {
				return serial.charCodeAt(cur++);
			};

			if(serial.length < 1 + skillLines.length)
				break;

			updateLevel(getData());

			for(var skillLine in skillLines) {
				updateSkillPt(skillLine, getData());
			}
		}

		//API
		return {
			//メソッド
			getSkillPt: getSkillPt,
			updateSkillPt: updateSkillPt,
			getLevel: getLevel,
			updateLevel: updateLevel,
			totalSkillPts: totalSkillPts,
			clearAllSkills: clearAllSkills,
			maxSkillPts: maxSkillPts,
			requiredLevel: requiredLevel,
			requiredExp: requiredExp,
			requiredExpRemain: requiredExpRemain,
			totalStatus: totalStatus,
			presetStatus: presetStatus,
			bringUpLevelToRequired: bringUpLevelToRequired,
			serialize: serialize,
			deserialize: deserialize,

			//プロパティ
			skillLines: skillLines,
			skillPtsGiven: skillPtsGiven,
			expRequired: expRequired,
			
			//定数
			SKILL_PTS_MIN: SKILL_PTS_MIN,
			SKILL_PTS_MAX: SKILL_PTS_MAX,
			LEVEL_MIN: LEVEL_MIN,
			LEVEL_MAX: LEVEL_MAX
		};
	})();
})(jQuery);
