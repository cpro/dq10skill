/// <reference path="dq10skill-monster-main.ts" />

namespace Dq10.SkillSimulator {
	export class MonsterUnit {
		data: Monster;
		monsterType: string;
		private level: number;
		skillLines: MonsterSkillLine[] = [];
		private skillLineDic: {[interfaceId: string]: MonsterSkillLine} = {};
		indivName: string;
		restartCount: number;
		id: string;
		badgeEquip: string[] = [];
		private natsuki: number;

		constructor(monsterType: string, idnum: number) {
			this.data = MonsterDB.monsters[monsterType];
			this.monsterType = monsterType;
			this.level = MonsterDB.consts.level.max;
			this.indivName = this.data.defaultName;
			this.restartCount = MonsterDB.consts.restart.max;

			this.id = monsterType + '_' + idnum.toString();

			this.data.skillLines.forEach((skillLineId) => {
				let skillLine = new MonsterSkillLine(skillLineId, 0);
				this.skillLines.push(skillLine);
				this.skillLineDic[skillLine.interfaceId] = skillLine;
			});
			//転生追加スキル
			for(var s = 0; s < ADDITIONAL_SKILL_MAX; s++) {
				let skillLine = new MonsterSkillLine('', s + 1);
				this.skillLines.push(skillLine);
				this.skillLineDic[skillLine.interfaceId] = skillLine;
			}

			//バッジ
			for(var i = 0; i < BADGE_COUNT; i++)
				this.badgeEquip.push(null);

			//なつき度
			this.natsuki = MonsterDB.natsukiPts.length - 1;
		}

		getSkillLine(interfaceId: string): MonsterSkillLine {
			return this.skillLineDic[interfaceId];
		}

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
			return this.skillLines.reduce((prev, skillLine) => {
				if(skillLine.skillLineId === '' || this.restartCount < skillLine.requiredRestarts)
					return prev;

				return prev + skillLine.skillPt;
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
			return this.getSkillLine('additional' + skillIndex.toString()).skillLineId;
		};
		//転生追加スキルの更新
		updateAdditionalSkill(skillIndex: number, newValue: string) {
			if(skillIndex < 0 || skillIndex > ADDITIONAL_SKILL_MAX) return false;
			var skillLine = this.getSkillLine('additional' + skillIndex.toString());

			if(newValue === null) {
				newValue = '';
			} else {
				if(this.skillLines.some((sl) => {
					if(sl == skillLine) return false;
					return sl.isAdditional && sl.skillLineId == newValue;
				}))
					return false;
			}
			skillLine.skillLineId = newValue;
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
			return this.skillLines.reduce((wholeTotal, skillLine) => {
				if(skillLine.skillLineId == '')
					return wholeTotal;

				var skills: Skill[];
				skills = MonsterDB.skillLines[skillLine.skillLineId].skills;
				var cur = skills.filter((skill) => {
					return skill.pt <= skillLine.skillPt;
				}).reduce((skillLineTotal, skill) => {
					return skillLineTotal + (skill[status] || 0);
				}, 0);
				return wholeTotal + cur;
			}, 0);
		};

		get isEnhanced(): boolean {
			return MonsterDB.consts.skillenhance.released.indexOf(this.monsterType) >= 0 &&
				this.restartCount >= MonsterDB.consts.skillenhance.restart;
		}
	}

	export module MonsterSaveData {
		//ビット数定義
		const BITS_MONSTER_TYPE = 6;
		const BITS_LEVEL = 8;
		const BITS_RESTART_COUNT = 4;
		const BITS_SKILL = 6;
		const BITS_ADDITIONAL_SKILL = 6;
		const BITS_BADGE = 10;
		const BITS_NATSUKI = 4;
		export function bitDataLength(): number {
			return BITS_MONSTER_TYPE +
				BITS_LEVEL +
				BITS_RESTART_COUNT +
				BITS_SKILL * (BASIC_SKILL_COUNT + ADDITIONAL_SKILL_MAX) +
				BITS_ADDITIONAL_SKILL * ADDITIONAL_SKILL_MAX;
		}
		export const BITS_ENCODE = 6;

		/** 最初期の独自ビット圧縮していたバージョン */
		const VERSION_FIRST = 1;
		/** レジェンドバッジ実装でバッジ保存数が1つ増えたバージョン */
		const VERSION_LEGEND_BADGE = 4;
		/** 現在のSerializerのバージョン */
		const VERSION_CURRENT_SERIALIZER = 4;

		export class Serializer {
			exec(monsters: MonsterUnit[]): string {
				var serial = '';

				// バージョン番号
				serial += String.fromCharCode(this.createVersionByteData());

				serial = monsters.reduce((cur, monster) => cur + this.serialize(monster), serial);

				return serial;
			}

			/** 現在のバージョン番号の最上位ビットにバージョン管理フラグとして1を立てる */
			private createVersionByteData() {
				return (VERSION_CURRENT_SERIALIZER | 0x80);
			}

			/**
			 * モンスターデータ シリアライズ仕様 (ver. 4)
			 *  1. 全体データ長
			 *  2. モンスタータイプID
			 *  3. レベル
			 *  4. 転生回数
			 *  5 -  9. 各スキルライン（転生時追加含む）のスキルポイント
			 * 10 - 11. 転生追加スキルライン2種のID
			 * 12 - 16. バッジID
			 * 17. なつき度
			 * 18. 個体名のデータ長
			 * 19 - . 個体名
			 *
			 * 個体名以外は数値で、それぞれ String.fromCharCode() し
			 * 連結した文字列+個体名をシリアルとして受け渡しする。
			 * ASCII範囲外の文字を含む可能性があるため、zip/unzip時には
			 * UTF-8エンコード等が必要。
			 */
			private serialize(monster: MonsterUnit): string {
				var data = [];
				data.push(monster.data.id);
				data.push(monster.getLevel());
				data.push(monster.getRestartCount());

				// スキルライン
				monster.skillLines.forEach((skillLine) => {
					data.push(skillLine.skillLineId == '' ? 0 : skillLine.skillPt);
				});

				// 転生追加スキルライン
				for(var i = 0; i < ADDITIONAL_SKILL_MAX; i++) {
					if(monster.getAdditionalSkill(i) === '') {
						data.push(0);
						continue;
					}
					MonsterDB.additionalSkillLines.some((additionalSkillLine) => {
						if(monster.getAdditionalSkill(i) == additionalSkillLine.name) {
							data.push(additionalSkillLine.id);
							return true;
						}
						return false;
					});
				}

				// バッジ
				for(i = 0; i < BADGE_COUNT; i++) {
					var badgeIdNum = monster.badgeEquip[i] === null ? 0 : parseInt(monster.badgeEquip[i], 10);
					data.push(badgeIdNum);
				}

				data.push(monster.getNatsuki());

				var serial = data.map((d) => String.fromCharCode(d)).join('');

				// 個体名
				var indivName = monster.getIndividualName();
				serial += String.fromCharCode(indivName.length) + indivName;

				// 先頭にシリアル全体の長さを記録
				serial = String.fromCharCode(serial.length) + serial;

				return serial;
			}
		}

		export class Deserializer {
			private version: number = VERSION_CURRENT_SERIALIZER;

			constructor(private wholeSerial: string) {
			}

			exec(callback: (monster: MonsterUnit, idnum: number) => void): void {
				var cur = 0;
				var getData = () => this.wholeSerial.charCodeAt(cur++);

				this.version = this.judgeVersion();

				if(this.version > VERSION_FIRST) {
					cur++;
					var idnum = 0;

					while(cur < this.wholeSerial.length) {
						var len = getData();
						var serial = this.wholeSerial.substring(cur, cur + len);
						var newMonster = this.deserialize(serial, idnum++);
						callback(newMonster, idnum);
						cur+= len;
					}
				} else {
					// 初期バージョンの場合: セミコロン区切りでステータスと個体名が交互に入ってくる
					var serials = this.wholeSerial.split(';');
					var idnum = 0;
					while(serials.length > 0) {
						var newMonster = this.deserializeAsFirstVersion(serials.shift(), idnum++);
						newMonster.updateIndividualName(UTF8.fromUTF8(Base64.atob(serials.shift())));
						callback(newMonster, idnum);
					}
				}
			}

			private deserialize(serial: string, idnum: number): MonsterUnit {
				var cur = 0;
				var getData = () => serial.charCodeAt(cur++);

				var DB = MonsterDB;
				var monster: MonsterUnit;

				var monsterTypeId = getData();
				Object.keys(DB.monsters).some((monsterType) => {
					if(monsterTypeId == DB.monsters[monsterType].id) {
						monster = new MonsterUnit(monsterType, idnum);
						return true;
					}
					return false;
				});
				if(monster === undefined) return null;

				monster.updateLevel(getData());
				monster.updateRestartCount(getData());

				//スキル
				monster.skillLines.forEach((skillLine) => {
					skillLine.skillPt = getData();
				});

				//転生追加スキル種類
				for(var i = 0; i < ADDITIONAL_SKILL_MAX; i++) {
					var additionalSkillId = getData();

					if(additionalSkillId === 0) {
						monster.updateAdditionalSkill(i, null);
						continue;
					}

					DB.additionalSkillLines.some((skillLine) => {
						if(additionalSkillId == skillLine.id) {
							monster.updateAdditionalSkill(i, skillLine.name);
							return true;
						}
						return false;
					});
				}

				//バッジ
				var badgeCount = BADGE_COUNT;
				if(this.version < VERSION_LEGEND_BADGE)
					badgeCount = 4;

				for(i = 0; i < badgeCount; i++) {
					var badgeIdStr: string;
					var badgeId = getData();
					if(badgeId === 0) {
						badgeIdStr = null;
					} else {
						//0補間
						badgeIdStr = '00' + badgeId.toString();
						badgeIdStr = badgeIdStr.substring(badgeIdStr.length - 3);
					}
					monster.badgeEquip[i] = badgeIdStr;
				}

				//なつき度
				var natsuki = getData();
				monster.updateNatsuki(natsuki);

				//個体名
				var len = getData();
				var indivName = serial.substring(cur, cur + len);
				monster.updateIndividualName(indivName);

				return monster;
			}

			private judgeVersion(): number {
				var firstByte = this.wholeSerial.charCodeAt(0);

				// 先頭ビットが0の場合初期バージョンと判定（ID 1-28なので必ず0になる）
				if((firstByte & 0x80) === 0)
					return VERSION_FIRST;

				// 先頭ビットを除去したものをバージョン番号とする
				return (firstByte & 0x7f);
			}

			private deserializeAsFirstVersion(serial: string, idnum: number): MonsterUnit {
				var DB = MonsterDB;
				var monster: MonsterUnit;

				serial = Base64.atob(serial);
				var bitArray = [];
				for(var i = 0; i < serial.length; i++)
					bitArray = bitArray.concat(numToBitArray(serial.charCodeAt(i), 8));

				var monsterTypeId = bitArrayToNum(bitArray.splice(0, BITS_MONSTER_TYPE));
				Object.keys(DB.monsters).some((monsterType) => {
					if(monsterTypeId == DB.monsters[monsterType].id) {
						monster = new MonsterUnit(monsterType, idnum);
						return true;
					}
					return false;
				});

				if(monster === undefined) return null;

				monster.updateLevel(bitArrayToNum(bitArray.splice(0, BITS_LEVEL)));
				monster.updateRestartCount(bitArrayToNum(bitArray.splice(0, BITS_RESTART_COUNT)));

				//スキル
				monster.skillLines.forEach((skillLine) => {
					skillLine.skillPt = bitArrayToNum(bitArray.splice(0, BITS_SKILL));
				});

				//転生追加スキル種類
				for(var i = 0; i < ADDITIONAL_SKILL_MAX; i++) {
					var additionalSkillId = bitArrayToNum(bitArray.splice(0, BITS_ADDITIONAL_SKILL));

					if(additionalSkillId === 0) {
						monster.updateAdditionalSkill(i, null);
						continue;
					}

					DB.additionalSkillLines.some((skillLine) => {
						if(additionalSkillId == skillLine.id) {
							monster.updateAdditionalSkill(i, skillLine.name);
							return true;
						}
						return false;
					});
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

				function bitArrayToNum(bitArray: number[]) {
					return bitArray.reduce((prev, bit) => prev << 1 | bit, 0);
				}
				function numToBitArray(num: number, digits: number) {
					var bitArray: number[] = [];
					for(var i = digits - 1; i >= 0; i--) {
						bitArray.push(num >> i & 1);
					}
					return bitArray;
				}
			}
		}
	}

	export class MonsterSkillLine {
		public skillLineId: string;
		private _skillPt: number = 0;
		private _requiredRestarts: number;
		private _interfaceId: string;
		private _isAdditional: boolean = false;

		/**
		 *
		 */
		constructor(id: string, requiredRestarts: number) {
			this.skillLineId = id;
			this._requiredRestarts = requiredRestarts;
			if(requiredRestarts == 0) {
				this._interfaceId = id;
			} else {
				this._interfaceId = 'additional' + (requiredRestarts - 1).toString();
				this._isAdditional = true;
			}
		}

		get name(): string {
			if(this.skillLineId === '')
				return '';
			return MonsterDB.skillLines[this.skillLineId].name;
		}

		get enhancedName(): string {
			if(this.isAdditional || this.skillLineId === '')
				return '';
			return MonsterDB.skillLines[this.skillLineId].enhancedName || '';
		}

		get requiredRestarts(): number {
			return this._requiredRestarts;
		}

		get skillPt(): number {
			return this._skillPt;
		}
		set skillPt(val: number) {
			var max = (this.enhancedName == '' ? MonsterDB.consts.skillPts.max : MonsterDB.consts.skillPts.enhanced);
			if(val < MonsterDB.consts.skillPts.min || val > max)
				return;
			this._skillPt = val;
		}

		get interfaceId(): string {
			return this._interfaceId;
		}

		get isAdditional(): boolean {
			return this._isAdditional;
		}
	}
}
