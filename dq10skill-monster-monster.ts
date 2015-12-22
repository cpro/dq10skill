/// <reference path="dq10skill-monster-main.ts" />

namespace Dq10.SkillSimulator {
	export class MonsterUnit {
		data: Monster;
		monsterType: string;
		private level: number;
		skillPts: {[skillLineId: string]: number} = {};
		indivName: string;
		restartCount: number;
		id: string;
		private additionalSkills: string[];
		badgeEquip: string[];
		private natsuki: number;
		
		constructor(monsterType: string, idnum: number) {
			this.data = MonsterDB.monsters[monsterType];
			this.monsterType = monsterType;
			this.level = MonsterDB.consts.level.max;
			this.indivName = this.data.defaultName;
			this.restartCount = MonsterDB.consts.restart.max;
			
			this.id = monsterType + '_' + idnum.toString();
			
			this.data.skillLines.forEach((skillLineId) => {
				this.skillPts[skillLineId] = 0;
			});
			//転生追加スキル
			this.additionalSkills = [];
			for(var s = 0; s < ADDITIONAL_SKILL_MAX; s++) {
				this.additionalSkills[s] = null;
				this.skillPts['additional' + s.toString()] = 0;
			}

			//バッジ
			this.badgeEquip = [null, null, null, null];

			//なつき度
			this.natsuki = MonsterDB.natsukiPts.length - 1;
		}
		
		//スキルポイント取得
		getSkillPt(skillLineId: string) {
			return this.skillPts[skillLineId];
		}
		
		//スキルポイント更新：不正値の場合falseを返す
		updateSkillPt(skillLineId: string, newValue: number) {
			if(newValue < MonsterDB.consts.skillPts.min ||
			   newValue > MonsterDB.consts.skillPts.max) {
				return false;
			}
			
			this.skillPts[skillLineId] = newValue;
			return true;
		};
		
		//レベル値取得
		getLevel() {
			return this.level;
		};
		
		//レベル値更新
		updateLevel(newValue: number) {
			var oldValue = this.level;
			if(newValue < MonsterDB.consts.level.min ||
			   newValue > MonsterDB.consts.level.max) {
				return oldValue;
			}
			
			this.level = newValue;
			return newValue;
		};

		//スキルポイント合計
		totalSkillPts() {
			return Object.keys(this.skillPts).reduce((prev, skillLineId) => {
				var m = skillLineId.match(/^additional(\d+)/);
				if(m && (this.restartCount < parseInt(m[1], 10) + 1 ||
				   this.getAdditionalSkill(parseInt(m[1], 10)) === null))
					return prev;

				return prev + this.skillPts[skillLineId];
			}, 0);
		};
		
		//現在のレベルに対するスキルポイント最大値
		maxSkillPts() {
			return MonsterDB.skillPtsGiven[this.level];
		};
		
		//スキルポイント合計に対する必要レベル取得
		requiredLevel() {
			var restartSkillPt = this.getRestartSkillPt();
			var natsukiSkillPts = this.getNatsukiSkillPts();
			var total = this.totalSkillPts() - restartSkillPt - natsukiSkillPts;
			
			for(var l = MonsterDB.consts.level.min; l <= MonsterDB.consts.level.max; l++) {
				if(MonsterDB.skillPtsGiven[l] >= total)
					return l;
			}
			return NaN;
		};
		
		//モンスター・レベルによる必要経験値
		requiredExp(level: number) {
			return Math.floor(MonsterDB.expRequired[this.data.expTable][level] *
				(1 + this.restartCount * MonsterDB.consts.restart.expRatio));
		};
		
		//転生時の必要経験値 Lv50経験値×転生補正値の累計
		additionalExp() {
			var expMax = MonsterDB.expRequired[this.data.expTable][MonsterDB.consts.level.max];
			if(isNaN(expMax)) return 0;

			var additionalExp = 0;
			for(var r = 0; r < this.restartCount; r++) {
				additionalExp += Math.floor(expMax * (1 + r * MonsterDB.consts.restart.expRatio));
			}

			return additionalExp;
		};

		//不足経験値
		requiredExpRemain() {
			var required = this.requiredLevel();
			if(required <= this.level) return 0;
			var remain = this.requiredExp(required) - this.requiredExp(this.level);
			return remain;
		};

		//個体名の取得
		getIndividualName() {
			return this.indivName;
		};
		//個体名の更新
		updateIndividualName(newName: string) {
			this.indivName = newName;
		};

		//転生回数の取得
		getRestartCount() {
			return this.restartCount;
		};
		//転生回数の更新
		updateRestartCount(newValue: number) {
			if(newValue < MonsterDB.consts.restart.min || newValue > MonsterDB.consts.restart.max) {
				return false;
			}
			
			this.restartCount = newValue;
			return true;
		};
		//転生による追加スキルポイントの取得
		getRestartSkillPt() {
			return MonsterDB.consts.restart.skillPts[this.restartCount];
		};

		//転生追加スキルの取得
		getAdditionalSkill(skillIndex: number) {
			return this.additionalSkills[skillIndex];
		};
		//転生追加スキルの更新
		updateAdditionalSkill(skillIndex: number, newValue: string) {
			if(skillIndex < 0 || skillIndex > ADDITIONAL_SKILL_MAX) return false;
			
			if(newValue !== null) {
				for(var i = 0; i < this.additionalSkills.length; i++) {
					if(i == skillIndex) continue;
					if(newValue == this.additionalSkills[i]) return false;
				}
			}
			
			this.additionalSkills[skillIndex] = newValue;
			return true;
		};

		//なつき度達成状態の取得
		getNatsuki() {
			return this.natsuki;
		};
		//なつき度達成状態の更新
		updateNatsuki(natsuki: number) {
			this.natsuki = natsuki;
			return true;
		};
		//なつき度に対するSP取得
		getNatsukiSkillPts() {
			return MonsterDB.natsukiPts[this.getNatsuki()].pt;
		};

		//Lv50時の各種ステータス合計値取得
		//ちから      : pow
		//みのまもり  : def
		//きようさ    : dex
		//すばやさ    : spd
		//こうげき魔力: magic
		//かいふく魔力: heal
		//さいだいHP  : maxhp
		//さいだいMP  : maxmp
		//みりょく    : charm
		//おもさ      : weight
		//こうげき力  : atk
		//しゅび力    : def
		getTotalStatus(status: string) {
			var total = this.getTotalPassive(status);

			//Lv50時ステータス
			if(status == 'atk') {
				total += this.getTotalStatus('pow');
			} else if(status == 'stylish') {
				total += this.getTotalStatus('charm');
			} else {
				total += this.data.status[status];
				//転生時のステータス増分
				total += this.data.increment[status] * this.restartCount;
			}

			//バッジ
			for(var i = 0; i < this.badgeEquip.length; i++) {
				if(this.badgeEquip[i] === null) continue;

				var badge = MonsterDB.badges[this.badgeEquip[i]];
				if(badge[status])
					total += badge[status];
			}

			return total;
		};
		//パッシブスキルのステータス加算合計値取得
		getTotalPassive(status: string) {
			return Object.keys(this.skillPts).reduce((wholeTotal, skillLineId) => {
				var m = skillLineId.match(/^additional(\d+)/);
				var skills: Skill[];
				if(m) {
					var index = parseInt(m[1], 10);
					if(this.restartCount < index + 1 || this.getAdditionalSkill(index) === null)
						return wholeTotal;
					else
						skills = MonsterDB.skillLines[this.getAdditionalSkill(index)].skills;
				} else {
					skills = MonsterDB.skillLines[skillLineId].skills;
				}
				var cur = skills.filter((skill) => {
					return skill.pt <= this.skillPts[skillLineId];
				}).reduce((skillLineTotal, skill) => {
					return skillLineTotal + (skill[status] || 0);
				}, 0);
				return wholeTotal + cur;
			}, 0);
		};
		

		//データをビット列にシリアル化
		serialize() {
			var numToBitArray = Base64forBit.numToBitArray;
			var bitArray: number[] = [];

			bitArray = bitArray.concat(numToBitArray(this.data.id, BITS_MONSTER_TYPE));
			bitArray = bitArray.concat(numToBitArray(this.level, BITS_LEVEL));
			bitArray = bitArray.concat(numToBitArray(this.restartCount, BITS_RESTART_COUNT));

			//スキル
			bitArray = Object.keys(this.skillPts).reduce((prev, skillLineId) => 
				prev.concat(numToBitArray(this.skillPts[skillLineId], BITS_SKILL))
			, bitArray)

			//転生追加スキル種類
			for(var i = 0; i < ADDITIONAL_SKILL_MAX; i++) {
				var additionalSkillId = 0;

				MonsterDB.additionalSkillLines.some((additionalSkillLine) => {
					if(this.additionalSkills[i] == additionalSkillLine.name) {
						additionalSkillId = additionalSkillLine.id;
						return true;
					} else {
						return false;
					}
				});
				bitArray = bitArray.concat(numToBitArray(additionalSkillId, BITS_ADDITIONAL_SKILL));
			}

			//バッジ
			for(i = 0; i < BADGE_COUNT; i++) {
				var badgeIdNum = this.badgeEquip[i] === null ? 0 : parseInt(this.badgeEquip[i], 10);
				bitArray = bitArray.concat(numToBitArray(badgeIdNum, BITS_BADGE));
			}

			//なつき度
			bitArray = bitArray.concat(numToBitArray(this.natsuki, BITS_NATSUKI));

			return bitArray;
		};

		//ビット列からデータを復元
		static deserialize(bitArray: number[], idnum: number) {
			var bitArrayToNum = Base64forBit.bitArrayToNum;
			var monster: MonsterUnit;

			var monsterTypeId = bitArrayToNum(bitArray.splice(0, BITS_MONSTER_TYPE));
			for(var monsterType in MonsterDB.monsters) {
				if(monsterTypeId == MonsterDB.monsters[monsterType].id) {
					monster = new MonsterUnit(monsterType, idnum);
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
					continue;
				}

				for(var j = 0; j < MonsterDB.additionalSkillLines.length; j++) {
					if(additionalSkillId == MonsterDB.additionalSkillLines[j].id) {
						monster.updateAdditionalSkill(i, MonsterDB.additionalSkillLines[j].name);
						break;
					}
				}
			}

			//バッジ
			if(bitArray.length >= BITS_BADGE * BADGE_COUNT) {
				var badgeIdStr: string;
				
				for(i = 0; i < BADGE_COUNT; i++) {
					var badgeId = bitArrayToNum(bitArray.splice(0, BITS_BADGE));
					if(badgeId === 0) {
						badgeIdStr = null;
					} else {
						//0補間
						badgeIdStr = '00' + badgeId.toString();
						badgeIdStr = badgeIdStr.substring(badgeIdStr.length - 3);
					}
					monster.badgeEquip[i] = badgeIdStr;
				}
			}

			//なつき度
			if(bitArray.length >= BITS_NATSUKI) {
				var natsuki = bitArrayToNum(bitArray.splice(0, BITS_NATSUKI));
				monster.updateNatsuki(natsuki);
			} else {
				monster.updateNatsuki(0);
			}

			return monster;
		};		
	}
	
	export class Base64forBit {
		static EN_CHAR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
		static BITS_ENCODE = 6; //6ビットごとに区切ってエンコード
		
		static encode(bitArray: number[]) {
			for(var i = (bitArray.length - 1) % this.BITS_ENCODE + 1 ; i < this.BITS_ENCODE; i++) bitArray.push(0); //末尾0補完

			var base64str = '';
			while(bitArray.length > 0) {
				base64str += this.EN_CHAR.charAt(this.bitArrayToNum(bitArray.splice(0, this.BITS_ENCODE)));
			}

			return base64str;
		}

		static decode(base64str: string) {
			var bitArray: number[] = [];
			for(var i = 0; i < base64str.length; i++) {
				bitArray = bitArray.concat(this.numToBitArray(this.EN_CHAR.indexOf(base64str.charAt(i)), this.BITS_ENCODE));
			}

			return bitArray;
		}

		static bitArrayToNum(bitArray: number[]) {
			var num = 0;
			for(var i = 0; i < bitArray.length; i++) {
				num = num << 1 | bitArray[i];
			}
			return num;
		}
		static numToBitArray(num: number, digits: number) {
			var bitArray: number[] = [];
			for(var i = digits - 1; i >= 0; i--) {
				bitArray.push(num >> i & 1);
			}
			return bitArray;
		}
	}
}