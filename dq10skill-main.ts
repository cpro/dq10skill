/// <reference path="typings/jquery/jquery.d.ts" />
/// <reference path="typings/jqueryui/jqueryui.d.ts" />

/// <reference path="typings/dq10skill.d.ts" />
/// <reference path="typings/rawdeflate.d.ts" />
/// <reference path="typings/shortcut.d.ts" />

/// <reference path="dq10skill-simulatorcommand.ts" />
/// <reference path="base64.ts" />

namespace Dq10.SkillSimulator {
	export var Simulator: SimulatorModel;
	export var SimulatorDB: SkillSimulatorDB;

	interface VocationData {
		id: string;
		level: number;
		trainingSkillPt: number;
		skillPts: SkillPt[];
	}
	interface SkillLineData {
		id: string;
		skillPts: SkillPt[];
		custom: number[];
	}
	interface SkillPt {
		vocationId: string;
		skillLineId: string;
		pt: number;
		msp: number;
	}

	export class SimulatorModel {
		private DB: SkillSimulatorDB;

		//パラメータ格納用
		private vocations: VocationData[] = [];
		private vocationDic: { [vocationId: string]: VocationData } = {};
		private skillLines: SkillLineData[] = [];
		private skillLineDic: { [skillLineId: string]: SkillLineData } = {};
		/** 全スキルポイント情報を保持する配列 */
		private wholePts: SkillPt[] = [];
		private skillPtDic: {
			[vocationId: string]: {
				[skillLineId: string]: SkillPt;
			}
		} = {};

		private _mspAvailable: number;

		constructor() {
		}

		/* メソッド */
		//パラメータ初期化
		initialize() {
			this.DB = SimulatorDB;

			this.vocations = Object.keys(this.DB.vocations).map((vocationId) => {
				var vocation: VocationData = {
					id: vocationId,
					level: this.DB.vocations[vocationId].initialLevel || this.DB.consts.level.min,
					trainingSkillPt: this.DB.consts.trainingSkillPts.min,
					skillPts: []
				};
				this.skillPtDic[vocationId] = {};
				vocation.skillPts = this.DB.vocations[vocationId].skillLines.map((skillLineId) => {
					var pt: SkillPt = {
						vocationId: vocationId,
						skillLineId: skillLineId,
						pt: 0,
						msp: this.DB.consts.msp.min
					};
					this.skillPtDic[vocationId][skillLineId] = pt;
					return pt;
				});
				this.wholePts = this.wholePts.concat(vocation.skillPts);
				this.vocationDic[vocationId] = vocation;
				return vocation;
			});

			this.skillLines = Object.keys(this.DB.skillLines).map((skillLineId) => {
				var skillLine: SkillLineData = {
					id: skillLineId,
					skillPts: this.wholePts.filter((skillPt) => skillPt.skillLineId == skillLineId),
					custom: [0, 0, 0]
				}
				this.skillLineDic[skillLineId] = skillLine;
				return skillLine;
			});

			this._mspAvailable = this.DB.consts.msp.possible;
		}

		//スキルポイント取得
		getSkillPt(vocationId: string, skillLineId: string): number {
			return this.skillPtDic[vocationId][skillLineId].pt;
		}

		//スキルポイント更新：不正値の場合falseを返す
		updateSkillPt(vocationId: string, skillLineId: string, newValue: number): boolean {
			var skillPt = this.skillPtDic[vocationId][skillLineId];
			var oldValue = skillPt.pt;
			if(newValue < this.DB.consts.skillPts.min || newValue > this.DB.consts.skillPts.max) {
				return false;
			}
			if(this.totalOfSameSkills(skillLineId) - oldValue + newValue > this.DB.consts.skillPts.max) {
				return false;
			}

			skillPt.pt = newValue;
			return true;
		}

		//レベル値取得
		getLevel(vocationId: string): number {
			return this.vocationDic[vocationId].level;
		}

		//レベル値更新
		updateLevel(vocationId: string, newValue: number): boolean {
			if(newValue < this.DB.consts.level.min || newValue > this.DB.consts.level.max) {
				return false;
			}

			this.vocationDic[vocationId].level = newValue;
			return true;
		}

		//特訓スキルポイント取得
		getTrainingSkillPt(vocationId: string): number {
			return this.vocationDic[vocationId].trainingSkillPt;
		}

		//特訓スキルポイント更新
		updateTrainingSkillPt(vocationId: string, newValue: number): boolean {
			if(newValue < this.DB.consts.trainingSkillPts.min || newValue > this.DB.consts.trainingSkillPts.max)
				return false;

			this.vocationDic[vocationId].trainingSkillPt = newValue;
			return true;
		}

		//マスタースキルポイント取得
		getMSP(vocationId: string, skillLineId: string): number {
			return this.skillPtDic[vocationId][skillLineId].msp;
		}

		//マスタースキルポイント更新
		updateMSP(vocationId: string, skillLineId: string, newValue: number): boolean {
			var oldValue = this.skillPtDic[vocationId][skillLineId].msp;
			if(newValue < this.DB.consts.msp.min || newValue > this.DB.consts.msp.max)
				return false;

			this.skillPtDic[vocationId][skillLineId].msp = newValue;
			return true;
		}

		//使用可能MSP取得
		getMSPAvailable(): number {
			return this._mspAvailable;
		}
		//使用可能MSP更新
		updateMSPAvailable(newValue: number): boolean {
			if(newValue < this.DB.consts.msp.min || newValue > this.DB.consts.msp.max)
				return false;

			this._mspAvailable = newValue;
			return true;
		}

		//使用中のマスタースキルポイント合計
		totalMSP(vocationId: string): number {
			return this.vocationDic[vocationId].skillPts.reduce((prev, skillPt) => {
				return prev + skillPt.msp;
			}, 0);
		}

		//職業のスキルポイント合計
		totalSkillPts(vocationId: string): number {
			return this.vocationDic[vocationId].skillPts.reduce((prev, skillPt) => {
				return prev + skillPt.pt;
			}, 0);
		}

		//同スキルのポイント合計 MSPは含まない
		totalOfSameSkills(skillLineId: string): number {
			var skillLine = this.skillLineDic[skillLineId];
			return skillLine.skillPts.reduce((prev, skillPt) => prev + skillPt.pt, 0);
		}

		//特定スキルすべてを振り直し（0にセット）
		clearPtsOfSameSkills(skillLineId: string): boolean {
			var skillLine = this.skillLineDic[skillLineId];
			skillLine.skillPts.forEach((skillPt) => {
				skillPt.pt = 0;
				skillPt.msp = this.DB.consts.msp.min;
			});
			return true;
		}

		//MSPを初期化
		clearMSP(): boolean {
			this.wholePts.forEach((skillPt) => skillPt.msp = 0);
			return true;
		}
		clearVocationMSP(vocationId: string): boolean {
			this.vocationDic[vocationId].skillPts.forEach((skillPt) => skillPt.msp = 0);
			return true;
		}

		//すべてのスキルを振り直し（0にセット）
		clearAllSkills() {
			this.wholePts.forEach((skillPt) => skillPt.pt = 0);
			this.clearMSP();
		}

		//職業レベルに対するスキルポイント最大値
		maxSkillPts(vocationId: string): number {
			return this.DB.skillPtsGiven[this.DB.vocations[vocationId].skillPtsTable][this.vocationDic[vocationId].level];
		}

		//スキルポイント合計に対する必要レベル取得
		requiredLevel(vocationId: string): number {
			var trainingSkillPt = this.getTrainingSkillPt(vocationId);
			var total = this.totalSkillPts(vocationId) - trainingSkillPt;

			for(var l = this.DB.consts.level.min; l <= this.DB.consts.level.max; l++) {
				if(this.DB.skillPtsGiven[this.DB.vocations[vocationId].skillPtsTable][l] >= total) {
					//特訓スキルポイントが1以上の場合、最低レベル50必要
					if(trainingSkillPt > this.DB.consts.trainingSkillPts.min && l < this.DB.consts.level.forTrainingMode)
						return this.DB.consts.level.forTrainingMode;
					else
						return l;
				}
			}
			return NaN;
		}

		//全職業の使用可能スキルポイント
		wholeSkillPtsAvailable(): number {
			return this.vocations.reduce((prev, vocation) => {
				var cur = this.maxSkillPts(vocation.id) + this.getTrainingSkillPt(vocation.id);
				return prev + cur;
			}, 0);
		}

		//全職業の使用済スキルポイント
		wholeSkillPtsUsed(): number {
			return this.wholePts.reduce((prev, skillPt) => prev + skillPt.pt, 0);
		}

		//職業・レベルによる必要経験値
		requiredExp(vocationId: string, level: number): number {
			return this.DB.expRequired[this.DB.vocations[vocationId].expTable][level];
		}

		//不足経験値
		requiredExpRemain(vocationId: string): number {
			var required = this.requiredLevel(vocationId);
			var current = this.vocationDic[vocationId].level;
			if(required <= current) return 0;
			var remain = this.requiredExp(vocationId, required) - this.requiredExp(vocationId, current);
			return remain;
		}

		//全職業の必要経験値合計
		totalRequiredExp(): number {
			return this.vocations.reduce((prev, vocation) => {
				var cur = this.requiredExp(vocation.id, vocation.level);
				return prev + cur;
			}, 0);
		}

		//全職業の不足経験値合計
		totalExpRemain(): number {
			return this.vocations.reduce((prev, vocation) => {
				var cur = this.requiredExpRemain(vocation.id);
				return prev + cur;
			}, 0);
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
		totalStatus(status: string): number {
			//スキルラインデータの各スキルから上記プロパティを調べ合計する
			return this.skillLines.reduce((wholeTotal, skillLine) => {
				var totalPts = this.totalOfSameSkills(skillLine.id);

				var cur = this.DB.skillLines[skillLine.id].skills.filter((skill) => {
					return skill.pt <= totalPts && skill[status];
				}).reduce((skillLineTotal, skill) => {
					return skillLineTotal + skill[status];
				}, 0);
				return wholeTotal + cur;
			}, 0);
		}

		//特定のパッシブスキルをすべて取得済みの状態にする
		//ステータスが変動した場合trueを返す
		presetStatus (status: string): boolean {
			var returnValue = false;

			this.vocations.forEach((vocation) => {
				this.DB.vocations[vocation.id].skillLines.forEach((skillLineId) => {
					if(!this.DB.skillLines[skillLineId].unique) return;

					var currentPt = this.getSkillPt(vocation.id, skillLineId);
					var skills = this.DB.skillLines[skillLineId].skills.filter((skill) => {
						return skill.pt > currentPt && skill[status];
					});
					if(skills.length > 0) {
						this.updateSkillPt(vocation.id, skillLineId, skills[skills.length - 1].pt);
						returnValue = true;
					}
				});
			});

			return returnValue;
		}

		//現在のレベルを取得スキルに対する必要レベルにそろえる
		bringUpLevelToRequired (): boolean {
			this.vocations.forEach((vocation) => {
				var required = this.requiredLevel(vocation.id);
				if(vocation.level < required)
					this.updateLevel(vocation.id, required);
			});
			return true;
		}

		getCustomSkills(skillLineId: string): number[] {
			return this.skillLineDic[skillLineId].custom;
		}

		setCustomSkills(skillLineId: string, customIds: number[], rank: number): boolean {
			if(customIds.length != this.skillLineDic[skillLineId].custom.length)
				return false;

			for(var r = 0; r < this.DB.consts.customSkill.count; r++) {
				//設定しようとしているランク以外に同じカスタムスキルが設定されていたらそれを解除する
				if(r != rank && customIds[r] == customIds[rank])
					this.skillLineDic[skillLineId].custom[r] = 0;
				else
					this.skillLineDic[skillLineId].custom[r] = customIds[r];
			}
			return true;
		}

		serialize(): string {
			var serial = new SimulatorSaveData.Serializer().exec(this);
			return serial;
		}
		deserialize(serial: string): void {
			new SimulatorSaveData.Deserializer(serial).exec(this);
		}
		deserializeBit(serial: string): void {
			new SimulatorSaveData.Deserializer(serial, true).exec(this);
		}
	}

	module SimulatorSaveData {
		const VOCATIONS_DATA_ORDER = [
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
			'monstermaster', //まもの使い
			'itemmaster',    //どうぐ使い
			'dancer',        //踊り子
			'fortuneteller', //占い師
			'druid',         //天地雷鳴士
			'gadabout'       //遊び人
		];
		const BITS_LEVEL = 8; //レベルは8ビット確保
		const BITS_SKILL = 7; //スキルは7ビット
		const BITS_TRAINING = 7; //特訓スキルポイント7ビット

		/** 最初期の独自ビット圧縮していたバージョン */
		const VERSION_FIRST = 1;
		/** バージョン番号管理開始以前のバージョン */
		const VERSION_UNMANAGED = 2;
		/** MSPが職業ごとの管理になったバージョン */
		const VERSION_VOCATIONAL_MSP = 4;
		/** 現在のSerializerのバージョン */
		const VERSION_CURRENT_SERIALIZER = 4;

		export class Serializer {
			constructor() {
			}

			exec(sim: SimulatorModel): string {
				var DB = SimulatorDB;

				var serial = '';
				var toByte = String.fromCharCode;

				// バージョン番号
				serial += toByte(this.createVersionByteData());

				//先頭に職業の数を含める
				serial += toByte(VOCATIONS_DATA_ORDER.length);

				VOCATIONS_DATA_ORDER.forEach((vocationId) => {
					serial += toByte(sim.getLevel(vocationId));
					serial += toByte(sim.getTrainingSkillPt(vocationId));

					DB.vocations[vocationId].skillLines.forEach((skillLineId) => {
						serial += toByte(sim.getSkillPt(vocationId, skillLineId));
						serial += toByte(sim.getMSP(vocationId, skillLineId));
					});
				});

				//使用可能MSP
				serial += toByte(sim.getMSPAvailable());

				// カスタムスキルデータ長を格納
				serial += toByte(DB.consts.customSkill.count);

				//末尾にカスタムスキルをスキルラインIDとペアで格納
				Object.keys(DB.skillLines).forEach((skillLineId) => {
					var customSkills = sim.getCustomSkills(skillLineId);

					// カスタムスキルのいずれかにスキルがセットされている場合のみ格納
					if(customSkills.some((val) => val > 0)) {
						serial += toByte(DB.skillLines[skillLineId].id);
						serial += customSkills.map((val) => toByte(val)).join('');
					}
				})

				return serial;
			}

			/** 現在のバージョン番号の最上位ビットにバージョン管理フラグとして1を立てる */
			private createVersionByteData() {
				return (VERSION_CURRENT_SERIALIZER | 0x80);
			}
		}

		export class Deserializer {
			constructor(private serial: string, private isFirstVersion: boolean = false) {
			}

			exec(sim: SimulatorModel): void {
				var cur = 0;
				var getData = () => this.serial.charCodeAt(cur++);

				var version = this.judgeVersion();
				switch (version) {
					case VERSION_FIRST:
						this.execAsFirstVersion(sim);
						return;
					case VERSION_UNMANAGED:
						break;
					default:
						cur++;
						break;
				}

				var DB = SimulatorDB;

				//先頭に格納されている職業の数を取得
				var vocationCount = getData();

				for(var i = 0; i < vocationCount; i++) {
					var vocationId = VOCATIONS_DATA_ORDER[i];
					var vSkillLines = DB.vocations[vocationId].skillLines;

					if(this.serial.length - cur < 1 + 1 + vSkillLines.length)
						break;

					sim.updateLevel(vocationId, getData());
					sim.updateTrainingSkillPt(vocationId, getData());

					for(var s = 0; s < vSkillLines.length; s++) {
						sim.updateSkillPt(vocationId, vSkillLines[s], getData());
						if(version >= VERSION_VOCATIONAL_MSP)
							sim.updateMSP(vocationId, vSkillLines[s], getData());
					}
				}

				//使用可能MSPを取得
				if(version >= VERSION_VOCATIONAL_MSP) {
					sim.updateMSPAvailable(getData());
				}

				// スキルラインのid番号からID文字列を得るための配列作成
				var skillLineIds: string[] = [];
				Object.keys(DB.skillLines).forEach((skillLineId) => {
					skillLineIds[DB.skillLines[skillLineId].id] = skillLineId;
				});

				var skillLineCount: number;
				var customSkillLength: number;
				var skillLineDataLength: number;

				if(version === VERSION_UNMANAGED)
					customSkillLength = 0;
				else
					customSkillLength = getData();

				// スキルライン別データのデータ長: カスタムスキルデータ長 + スキルライン番号1byte
				skillLineDataLength = customSkillLength + 1;
				// MSPがスキルライン別管理の場合はもう1byte増やす
				if(version < VERSION_VOCATIONAL_MSP)
					skillLineDataLength += 1;

				// スキルライン別データ取得（MSP、カスタムスキル）
				while(this.serial.length - cur >= skillLineDataLength) {
					var skillLineId = skillLineIds[getData()];
					if(version < VERSION_VOCATIONAL_MSP) {
						var skillPt = getData();
						if(skillLineId !== undefined) {
							Object.keys(DB.vocations).filter((vocationId) => {
								return DB.vocations[vocationId].skillLines.indexOf(skillLineId) >= 0;
							}).forEach((vocationId) => {
								sim.updateMSP(vocationId, skillLineId, skillPt);
							});
						}
					}

					var customIds = [];
					for(var i = 0; i < customSkillLength; i++) {
						customIds.push(getData());
					}
					sim.setCustomSkills(skillLineId, customIds, 0);
				}
			}

			private judgeVersion(): number {
				// コンストラクタで初期バージョンのスイッチが与えられている場合
				if(this.isFirstVersion)
					return VERSION_FIRST;

				// 最上位ビットに1が立っていなければバージョン管理前と判定する
				// （管理前は先頭バイトに職業の数（15以下）を格納していたので、必ず0となる）
				var firstByte = this.serial.charCodeAt(0);
				if((firstByte & 0x80) === 0)
					return VERSION_UNMANAGED;

				// 先頭ビットを除去したものをバージョン番号とする
				return (firstByte & 0x7f);
			}

			private execAsFirstVersion(sim: SimulatorModel): void {
				var DB = SimulatorDB;

				var bitArray = [];
				for(var i = 0; i < this.serial.length; i++)
					bitArray = bitArray.concat(numToBitArray(this.serial.charCodeAt(i), 8));

				//特訓ポイントを含むかどうか: ビット列の長さで判断
				var isIncludingTrainingPts = bitArray.length >= (
					BITS_LEVEL +
					BITS_TRAINING +
					BITS_SKILL * DB.vocations[VOCATIONS_DATA_ORDER[0]].skillLines.length
				) * 10; //1.2VU（特訓モード実装）時点の職業数

				var cur = 0;
				VOCATIONS_DATA_ORDER.forEach((vocationId) => {
					sim.updateLevel(vocationId, bitArrayToNum(bitArray.slice(cur, cur += BITS_LEVEL)));

					if(isIncludingTrainingPts)
						sim.updateTrainingSkillPt(vocationId, bitArrayToNum(bitArray.slice(cur, cur += BITS_TRAINING)));
					else
						sim.updateTrainingSkillPt(vocationId, 0);

					DB.vocations[vocationId].skillLines.forEach((skillLineId) => {
						sim.updateSkillPt(vocationId, skillLineId, bitArrayToNum(bitArray.slice(cur, cur += BITS_SKILL)));
					});
				});

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

	class SimulatorCustomSkill {
		private data: CustomSkill;

		static emptySkillData: CustomSkill = {
			id: 0,
			name: '（なし）',
			viewName: '（なし）',
			selectorName: '',
			desc: '',
			mp: null,
			charge: null,
			atk: null,
			val: [0, 0, 0]
		}

		private skillLineId: string;
		private customSkillId: number;

		constructor(skillLineId?: string, customSkillId?: number) {
			if(skillLineId === undefined ||
			   skillLineId === null ||
			   SimulatorDB.skillLines[skillLineId].customSkills === undefined) {
				this.data = SimulatorCustomSkill.emptySkillData;
			} else {
				this.data = SimulatorDB.skillLines[skillLineId].customSkills.filter((custom) => custom.id == customSkillId)[0];

				if(this.data === undefined) {
					this.data = SimulatorCustomSkill.emptySkillData;
				}
			}
		}
		static emptySkill(): SimulatorCustomSkill {
			return new SimulatorCustomSkill();
		}

		getName(): string {
			return this.data.name;
		}

		getViewName(rank: number): string {
			return this.replaceRankValue(this.data.viewName, rank);
		}

		getSelectorName(rank: number): string {
			return this.replaceRankValue(this.data.selectorName, rank);
		}

		private replaceRankValue(template: string, rank: number){
			var ret = template;

			var rankName = 'ⅠⅡⅢ'.charAt(rank);
			ret = ret.replace('%r', rankName);

			var rankValue = this.data.val[rank];
			ret = ret.replace('%i', rankValue.toFixed(0)) //整数値
			         .replace('%f', rankValue.toFixed(1)); //小数値

			return ret;
		}

		getHintText(rank: number): string {
			const FULLWIDTH_ADJUSTER = 0xFEE0;
			var hint = this.data.desc;
			var rankValue = this.data.val[rank];

			var rankValFullWidth = rankValue.toString().replace(/[0-9.]/g, (m) =>
				String.fromCharCode(m.charCodeAt(0) + 0xFEE0)
			);
			hint = hint.replace('%z', rankValFullWidth);

			if((this.data.mp !== null) && (this.data.mp !== undefined))
				hint += `\n（消費MP: ${this.data.mp}）`;
			if((this.data.charge !== null) && (this.data.charge !== undefined))
				hint += `\n（チャージ: ${rankValue}秒）`;

			return hint;
		}
	}

	class SimulatorUI {
		private CLASSNAME_SKILL_ENABLED = 'enabled';
		private CLASSNAME_ERROR = 'error';

		private sim: typeof Simulator;
		private com: SimulatorCommandManager;

		private $ptConsole: JQuery;
		private $lvConsole: JQuery;
		private $trainingPtConsole: JQuery;
		private $mspMaxConsole: JQuery;
		private $mspAvailableConsole: JQuery;
		private $customSkillConsole: JQuery;

		private mspMode = false; //MSP編集モードフラグ

		private DB: SkillSimulatorDB;

		private customSkillSelector: CustomSkillSelector;

		constructor(sim: SimulatorModel) {
			this.DB = SimulatorDB;
			this.sim = sim;
			this.com = new SimulatorCommandManager();
		}

		private refreshAll() {
			this.hideConsoles();
			this.refreshAllVocationInfo();
			Object.keys(this.DB.skillLines).forEach((skillLineId) => this.refreshSkillList(skillLineId));
			this.refreshTotalSkillPt();
			this.refreshTotalPassive();
			this.refreshControls();
			this.refreshSaveUrl();
			this.refreshUrlBar();
			Object.keys(this.DB.skillLines).forEach((skillLineId) => this.refreshCustomSkill(skillLineId));
		}

		private refreshVocationInfo(vocationId: string) {
			var currentLevel = this.sim.getLevel(vocationId);
			var requiredLevel = this.sim.requiredLevel(vocationId);

			//見出し中のレベル数値
			$(`#${vocationId} .lv_h2`).text(currentLevel);
			var $levelH2 = $(`#${vocationId} h2`);

			//必要経験値
			$(`#${vocationId} .exp`).text(numToFormedStr(this.sim.requiredExp(vocationId, currentLevel)));

			//スキルポイント 残り / 最大値
			var maxSkillPts = this.sim.maxSkillPts(vocationId);
			var additionalSkillPts = this.sim.getTrainingSkillPt(vocationId);
			var remainingSkillPts = maxSkillPts + additionalSkillPts - this.sim.totalSkillPts(vocationId);
			var $skillPtsText = $(`#${vocationId} .skill_pt .pts`);
			$skillPtsText.text(remainingSkillPts + ' / ' + maxSkillPts);
			$('#training-' + vocationId).text(additionalSkillPts);

			//Lv不足の処理
			var isLevelError = (isNaN(requiredLevel) || currentLevel < requiredLevel);

			$levelH2.toggleClass(this.CLASSNAME_ERROR, isLevelError);
			$skillPtsText.toggleClass(this.CLASSNAME_ERROR, isLevelError);
			$(`#${vocationId} .expinfo .error`).toggle(isLevelError);
			if(isLevelError) {
				$(`#${vocationId} .req_lv`).text(numToFormedStr(requiredLevel));
				$(`#${vocationId} .exp_remain`).text(numToFormedStr(this.sim.requiredExpRemain(vocationId)));
			}

			//MSP 残り / 最大値
			var maxMSP = this.sim.getMSPAvailable();
			var remainingMSP = maxMSP - this.sim.totalMSP(vocationId);
			var $mspText = $(`#${vocationId} .mspinfo .pts`);
			$mspText.text(remainingMSP + ' / ' + maxMSP);

			var isMspError = (remainingMSP < 0);
			$mspText.toggleClass(this.CLASSNAME_ERROR, isMspError);
		}

		private refreshAllVocationInfo() {
			Object.keys(this.DB.vocations).forEach((vocationId) => this.refreshVocationInfo(vocationId));
		}

		private refreshTotalRequiredExp() {
			$('#total_exp').text(numToFormedStr(this.sim.totalRequiredExp()));
		}

		private refreshTotalExpRemain() {
			var totalExpRemain = this.sim.totalExpRemain();
			$('#total_exp_remain, #total_exp_remain_label').toggleClass(this.CLASSNAME_ERROR, totalExpRemain > 0);
			$('#total_exp_remain').text(numToFormedStr(totalExpRemain));
		}

		private refreshTotalPassive() {
			var status = 'maxhp,maxmp,pow,def,dex,spd,magic,heal,charm'.split(',');
			status.forEach((s) => $('#total_' + s).text(this.sim.totalStatus(s)));
		}

		private refreshSkillList(skillLineId: string) {
			$(`tr[class^=${skillLineId}_]`).removeClass(this.CLASSNAME_SKILL_ENABLED); //クリア
			var totalOfSkill = this.sim.totalOfSameSkills(skillLineId);

			Object.keys(this.DB.vocations).filter((vocationId) => {
				return this.DB.vocations[vocationId].skillLines.indexOf(skillLineId) >= 0;
			}).forEach((vocationId) => {
				var msp = this.sim.getMSP(vocationId, skillLineId);
				this.DB.skillLines[skillLineId].skills.some((skill, i) => {
					if(totalOfSkill + msp < skill.pt) return true;

					$(`#${vocationId} .${skillLineId}_${i}`).addClass(this.CLASSNAME_SKILL_ENABLED);
					return false;
				});

				var isError = totalOfSkill + msp > (this.DB.skillLines[skillLineId].unique ?
					this.DB.consts.skillPts.validUnique :
					this.DB.consts.skillPts.valid);
				$(`#${vocationId} .${skillLineId} .skill_total`)
					.text(totalOfSkill + msp)
					.toggleClass(this.CLASSNAME_ERROR, isError);

				if(msp > 0)
					$(`<span>(${msp})</span>`)
						.addClass('msp')
						.appendTo(`#${vocationId} .${skillLineId} .skill_total`);
			});
		}

		private refreshControls() {
			Object.keys(this.DB.vocations).forEach((vocationId) => {
				this.DB.vocations[vocationId].skillLines.forEach((skillLineId) => {
					this.refreshCurrentSkillPt(vocationId, skillLineId);
				})
			});
		}

		private refreshCurrentSkillPt(vocationId: string, skillLineId: string) {
			$(`#${vocationId} .${skillLineId} .skill_current`).text(this.sim.getSkillPt(vocationId, skillLineId));
		}

		private refreshTotalSkillPt() {
			var $cont = $('#total_sp');
			var available = this.sim.wholeSkillPtsAvailable();
			var remain = available - this.sim.wholeSkillPtsUsed();

			$cont.text(`${remain} / ${available}`);
			var isLevelError = (remain < 0);
			$cont.toggleClass(this.CLASSNAME_ERROR, isLevelError);
		}

		private refreshSaveUrl() {
			var url = this.makeCurrentUrl();

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

		private refreshUrlBar() {
			if(window.history && window.history.replaceState) {
				var url = this.makeCurrentUrl();
				history.replaceState(url, null, url);
			}
		}

		private refreshCustomSkill(skillLineId: string) {
			var $skillLineTable = $(`.${skillLineId}`);
			if($skillLineTable.length === 0) return;

			this.sim.getCustomSkills(skillLineId).forEach((customId, rank) => {
				var customSkill = new SimulatorCustomSkill(skillLineId, customId);
				var $skill = $skillLineTable.find(`tr.${skillLineId}_${rank + 15}`);
				$skill.find('.custom_skill_name').text(customSkill.getViewName(rank));
				$skill.attr('title', customSkill.getHintText(rank));
			});
		}

		private makeCurrentUrl() {
			return window.location.href.replace(window.location.search, "") + '?' +
				Base64.btoa(RawDeflate.deflate(this.sim.serialize()));

		}

		private selectSkillLine(skillLineId: string) {
			$('.skill_table').removeClass('selected');
			$('.' + skillLineId).addClass('selected');
		}

		private toggleMspMode(mode: boolean) {
			this.mspMode = mode;
			$('body').toggleClass('msp', mode);
		}

		private getCurrentVocation(currentNode: Element|EventTarget) {
			return $(currentNode).parents('.class_group').attr('id');
		}

		private getCurrentSkillLine(currentNode: Element|EventTarget) {
			return $(currentNode).parents('.skill_table').attr('class').split(' ')[0];
		}

		private hideConsoles() {
			this.$ptConsole.hide();
			this.$lvConsole.hide();
			this.$trainingPtConsole.hide();
			this.$mspMaxConsole.hide();
			this.$customSkillConsole.hide();
			this.$mspAvailableConsole.hide();
		}

		setup() {
			this.setupFunctions.forEach((func) => func());
			this.refreshAll();
		}

		private setupFunctions = [
			//イベント登録
			() => {
				this.com.on('VocationalInfoChanged', (vocationId: string) => {
					this.refreshVocationInfo(vocationId);
					//refreshTotalRequiredExp();
					//refreshTotalExpRemain();
					this.refreshTotalSkillPt();
					this.refreshUrlBar();
				});
				this.com.on('SkillLineChanged', (vocationId: string, skillLineId: string) => {
					this.refreshCurrentSkillPt(vocationId, skillLineId);
					this.refreshSkillList(skillLineId);
					this.refreshVocationInfo(vocationId);
					//refreshTotalExpRemain();
					this.refreshTotalSkillPt();
					this.refreshTotalPassive();
					this.refreshUrlBar();
				});
				this.com.on('MSPChanged', (vocationId: string, skillLineId: string) => {
					this.refreshSkillList(skillLineId);
					this.refreshVocationInfo(vocationId);
					this.refreshTotalPassive();
					this.refreshUrlBar();
				});
				this.com.on('MSPAvailableChanged', () => {
					this.refreshAllVocationInfo();
					this.refreshUrlBar();
				})
				this.com.on('WholeChanged', () => {
					this.refreshAll();
				});
				this.com.on('CustomSkillChanged', (skillLineId: string) => {
					this.refreshCustomSkill(skillLineId);
					this.refreshUrlBar();
				});
			},

			//レベル選択セレクトボックス項目設定
			() => {
				this.$lvConsole = $('#lv_console');
				var $select = $('#lv-select');
				for(var i = this.DB.consts.level.min; i <= this.DB.consts.level.max; i++) {
					$select.append($("<option />").val(i).text(`${i} (${this.DB.skillPtsGiven[1][i]})`));
				}

				$select.change((e) => {
					var vocationId = this.getCurrentVocation(<Element>e.currentTarget);
					this.com.updateLevel(vocationId, $(e.currentTarget).val());
				});
			},

			//レベル欄クリック時にUI表示
			() => {
				$('.ent_title h2').click((e) => {
					this.hideConsoles();

					var vocationId = this.getCurrentVocation(<Element>e.currentTarget);
					var consoleLeft = $(e.currentTarget).find('.lv_h2').position().left - 3;

					this.$lvConsole.appendTo($(e.currentTarget)).css({left: consoleLeft});
					$('#lv-select').val(this.sim.getLevel(vocationId));

					this.$lvConsole.show();
					e.stopPropagation();
				});
			},

			//特訓ポイント選択セレクトボックス設定
			() => {
				this.$trainingPtConsole = $('#training_pt_console');
				var $select = $('#training_pt_select');
				for(var i = 0; i <= this.DB.consts.trainingSkillPts.max; i++) {
					$select.append($('<option />').val(i).text(i.toString() +
						' (' + numToFormedStr(this.DB.trainingPts[i].stamps) + ')'));
				}

				$select.change((e) => {
					var vocationId = this.getCurrentVocation(<Element>e.currentTarget);

					return this.com.updateTrainingSkillPt(vocationId, parseInt($(e.currentTarget).val(), 10));
				});
			},

			//特訓表示欄クリック時にUI表示
			() => {
				$('.ent_title .training_pt').click((e) => {
					this.hideConsoles();

					var vocationId = this.getCurrentVocation(<Element>e.currentTarget);
					var consoleLeft = $('#training-' + vocationId).position().left - 3;

					this.$trainingPtConsole.appendTo($(e.currentTarget)).css({left: consoleLeft});
					$('#training_pt_select').val(this.sim.getTrainingSkillPt(vocationId));

					this.$trainingPtConsole.show();
					e.stopPropagation();
				});
			},

			//スピンボタン設定
			() => {
				this.$ptConsole = $('#pt_console');
				var $spinner = $('#pt_spinner');
				$spinner.spinner({
					min: this.DB.consts.skillPts.min,
					max: this.DB.consts.skillPts.max,
					spin: (e, ui) => {
						var vocationId = this.getCurrentVocation(e.currentTarget);
						var skillLineId = this.getCurrentSkillLine(e.currentTarget);

						var succeeded = this.mspMode ?
							this.com.updateMSP(vocationId, skillLineId, ui.value) :
							this.com.updateSkillPt(vocationId, skillLineId, ui.value);

						if(succeeded) {
							e.stopPropagation();
						} else {
							return false;
						}
					},
					change: (e, ui) => {
						var vocationId = this.getCurrentVocation(e.currentTarget);
						var skillLineId = this.getCurrentSkillLine(e.currentTarget);
						var newValue = $(e.currentTarget).val();
						var oldValue = this.mspMode ?
							this.sim.getMSP(vocationId, skillLineId) :
							this.sim.getSkillPt(vocationId, skillLineId);

						if(isNaN(newValue)) {
							$(e.currentTarget).val(oldValue);
							return false;
						}

						newValue = parseInt(newValue, 10);
						if(newValue == oldValue)
							return false;

						var succeeded = this.mspMode ?
							this.com.updateMSP(vocationId, skillLineId, newValue) :
							this.com.updateSkillPt(vocationId, skillLineId, newValue);

						if(!succeeded) {
							$(e.currentTarget).val(oldValue);
							return false;
						}
					},
					stop: (e, ui) => {
						var skillLineId = this.getCurrentSkillLine(e.currentTarget || e.target);
						this.selectSkillLine(skillLineId);
					}
				});
			},

			//残りMSP欄クリック時に使用可能MSP調整UI表示
			() => {
				this.$mspAvailableConsole = $('#mspavailable_console');
				$('.mspinfo').click((e) => {
					this.hideConsoles();

					this.$mspAvailableConsole.appendTo($(e.currentTarget));
					$('#mspavailable-spinner').val(this.sim.getMSPAvailable());

					this.$mspAvailableConsole.show();
					e.stopPropagation();
				});

				var $spinner = $('#mspavailable-spinner');
				$spinner.spinner({
					min: this.DB.consts.msp.min,
					max: this.DB.consts.msp.max,
					spin: (e, ui) => {
						var succeeded = this.com.updateMSPAvailable(ui.value);

						if(succeeded) {
							e.stopPropagation();
						} else {
							return false;
						}
					},
					change: (e, ui) => {
						var newValue = $(e.currentTarget).val();
						var oldValue = this.sim.getMSPAvailable();

						if(isNaN(newValue)) {
							$(e.currentTarget).val(oldValue);
							return false;
						}

						newValue = parseInt(newValue, 10);
						if(newValue == oldValue)
							return false;

						var succeeded = this.com.updateMSPAvailable(newValue);

						if(!succeeded) {
							$(e.currentTarget).val(oldValue);
							return false;
						}
					}
				});
			},

			//スピンコントロール共通
			() => {
				$('input.ui-spinner-input').click((e) => {
					//テキストボックスクリック時数値を選択状態に
					$(e.currentTarget).select();
				}).keypress((e) => {
					//テキストボックスでEnter押下時更新して選択状態に
					if(e.which == 13) {
						$('#url_text').focus();
						$(e.currentTarget).focus().select();
					}
				});
			},

			//スキルライン名クリック時にUI表示
			() => {
				$('.skill_table caption').mouseenter((e) => {
					this.hideConsoles();

					var vocationId = this.getCurrentVocation(<Element>e.currentTarget);
					var skillLineId = this.getCurrentSkillLine(<Element>e.currentTarget);

					//位置決め
					var $baseSpan = $(e.currentTarget).find('.skill_current');
					var consoleLeft = $baseSpan.position().left + $baseSpan.width() - 50;
					$('#pt_reset').css({'margin-left': $(e.currentTarget).find('.skill_total').width() + 10});

					this.$ptConsole.appendTo($(e.currentTarget).find('.console_wrapper')).css({left: consoleLeft});
					$('#pt_spinner').val(this.mspMode ? this.sim.getMSP(vocationId, skillLineId) : this.sim.getSkillPt(vocationId, skillLineId));

					//selectSkillLine(skillLineId);

					this.$ptConsole.show();
					e.stopPropagation();
				}).mouseleave((e) => {
					if($('#pt_spinner:focus').length === 0)
						this.hideConsoles();
				});
			},

			//MSP込み最大値設定ボタン
			() => {
				$('#max-with-msp').button({
					icons: { primary: 'ui-icon-circle-arrow-s' },
					text: true
				}).click((e) => {
					var mspAvailable = this.sim.getMSPAvailable();
					var maxPtWithMsp: number = this.DB.consts.skillPts.valid - mspAvailable;
					var maxPtWithMspUnique: number = this.DB.consts.skillPts.validUnique - mspAvailable;

					var vocationId = this.getCurrentVocation(<Element>e.currentTarget);
					var skillLineId = this.getCurrentSkillLine(<Element>e.currentTarget);
					this.com.updateSkillPt(vocationId, skillLineId, this.DB.skillLines[skillLineId].unique ? maxPtWithMspUnique : maxPtWithMsp);
					this.com.updateMSP(vocationId, skillLineId, mspAvailable);
					e.stopPropagation();
				});
			},

			//職固有スキルホバー時にUI表示
			() => {
				this.$mspMaxConsole = $('#mspmax_console');
				Object.keys(this.DB.skillLines).forEach((skillLineId) => {
					var skillLine = this.DB.skillLines[skillLineId];
					if(!skillLine.unique) return;

					var lastSkill = skillLineId + '_' + (skillLine.skills.length - 1).toString();

					$('.' + lastSkill).mouseenter((e) => {
						this.hideConsoles();
						$(e.currentTarget).find('.skill_name').append(this.$mspMaxConsole);
						this.$mspMaxConsole.show();
						e.stopPropagation();
					}).mouseleave((e) => {
						this.hideConsoles();
					});
				})
			},

			() => {
				this.customSkillSelector = new CustomSkillSelector(this.sim, this.com);
				this.customSkillSelector.setup();
			},

			//カスタムスキル編集ボタン
			() => {
				$('#show-customskill-dialog').button({
					icons: { primary: 'ui-icon-pencil'},
					text: true
				}).click((e) => {
					var skillLineId = this.getCurrentSkillLine(e.currentTarget);
					this.customSkillSelector.show(skillLineId);
					e.stopPropagation();
				});
			},

			//160以上スキルホバー時にUI表示
			() => {
				this.$customSkillConsole = $('#customskill_console');

				$('.skill_table tr[class$="_15"],.skill_table tr[class$="_16"],.skill_table tr[class$="_17"]').mouseenter((e) => {
					var skillLineId = this.getCurrentSkillLine(e.currentTarget);
					$(e.currentTarget).parent().children(`.${skillLineId}_15`).find('.skill_name').append(this.$customSkillConsole);
					this.$customSkillConsole.show();
					e.stopPropagation();
				}).mouseleave((e) => {
					this.hideConsoles();
				});
			},

			//範囲外クリック時・ESCキー押下時にUI非表示
			() => {
				this.$ptConsole.click((e) => e.stopPropagation());
				this.$lvConsole.click((e) => e.stopPropagation());
				this.$trainingPtConsole.click((e) => e.stopPropagation());

				$('body').click((e) => this.hideConsoles()).keydown((e) => {
					if(e.which == 27) this.hideConsoles();
				});
			},

			//リセットボタン設定
			() => {
				$('#pt_reset').button({
					icons: { primary: 'ui-icon-refresh' },
					text: false
				}).click((e) => {
					var vocationId = this.getCurrentVocation(<Element>e.currentTarget);
					var skillLineId = this.getCurrentSkillLine(<Element>e.currentTarget);

					this.selectSkillLine(skillLineId);

					if(this.mspMode)
						this.com.updateMSP(vocationId, skillLineId, 0);
					else
						this.com.updateSkillPt(vocationId, skillLineId, 0);
					$('#pt_spinner').val(0);
				}).dblclick((e) => {
					var skillLineId;
					//ダブルクリック時に各職業の該当スキルをすべて振り直し
					if(this.mspMode) {
						if(!window.confirm('マスタースキルポイントをすべて振りなおします。'))
							return;

						this.com.clearMSP();
					} else {
						skillLineId = this.getCurrentSkillLine(<Element>e.currentTarget);
						var skillName = this.DB.skillLines[skillLineId].name;

						if(!window.confirm('スキル「' + skillName + '」をすべて振りなおします。'))
							return;

						this.com.clearPtsOfSameSkills(skillLineId);
						$('.' + skillLineId + ' .skill_current').text('0');
					}

					$('#pt_spinner').val(0);
				});
			},

			//スキルテーブル項目クリック時
			() => {
				$('.skill_table tr[class]').click((e) => {
					var vocationId = this.getCurrentVocation(<Element>e.currentTarget);
					var skillLineId = this.getCurrentSkillLine(<Element>e.currentTarget);
					var skillIndex = parseInt($(e.currentTarget).attr('class').replace(skillLineId + '_', ''), 10);

					this.selectSkillLine(skillLineId);

					var requiredPt = this.DB.skillLines[skillLineId].skills[skillIndex].pt;
					var totalPtsOfOthers;
					if(this.mspMode) {
						totalPtsOfOthers = this.sim.totalOfSameSkills(skillLineId);
						if(requiredPt < totalPtsOfOthers) return;

						this.com.updateMSP(vocationId, skillLineId, requiredPt - totalPtsOfOthers);
					} else {
						totalPtsOfOthers = this.sim.totalOfSameSkills(skillLineId) + this.sim.getMSP(vocationId, skillLineId) - this.sim.getSkillPt(vocationId, skillLineId);
						if(requiredPt < totalPtsOfOthers) return;

						this.com.updateSkillPt(vocationId, skillLineId, requiredPt - totalPtsOfOthers);
					}
				});
			},

			//MSPモード切替ラジオボタン
			() => {
				$('#msp_selector input').change((e) => {
					this.toggleMspMode($(e.currentTarget).val() == 'msp');
				});
				shortcut.add('Ctrl+M', () => {
					var newValue = this.mspMode ? 'normal' : 'msp';
					$('#msp_selector input').prop('checked', false);
					$(`#msp_selector input[value='${newValue}']`).prop('checked', true).change();
				});
			},

			//URLテキストボックスクリック・フォーカス時
			() => {
				$('#url_text').focus((e) => {
					this.refreshSaveUrl();
				}).click((e) => {
					$(e.currentTarget).select();
				});
			},

			//保存用URLツイートボタン設定
			() => {
				$('#tw-saveurl').button().click((e) => {
					this.refreshSaveUrl();

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
					var windowParam = $.map(windowParams, (val, key) => key + '=' + val).join(',');
					window.open((<HTMLAnchorElement>e.currentTarget).href, null, windowParam);

					return false;
				});
			},

			//おりたたむ・ひろげるボタン設定
			() => {
				var HEIGHT_FOLDED = '48px';
				var HEIGHT_UNFOLDED = $('.class_group:last').height() + 'px';
				var CLASSNAME_FOLDED = 'folded';

				$('.toggle_ent').button({
					icons: { primary: 'ui-icon-arrowthickstop-1-n' },
					text: false,
					label: 'おりたたむ'
				}).click((e) => {
					var $entry = $(e.currentTarget).parents('.class_group');
					$entry.toggleClass(CLASSNAME_FOLDED);

					if($entry.hasClass(CLASSNAME_FOLDED)) {
						$entry.animate({height: HEIGHT_FOLDED});
						$(e.currentTarget).button('option', {
							icons: {primary: 'ui-icon-arrowthickstop-1-s'},
							label: 'ひろげる'
						});
					} else {
						$entry.animate({height: HEIGHT_UNFOLDED});
						$(e.currentTarget).button('option', {
							icons: {primary: 'ui-icon-arrowthickstop-1-n'},
							label: 'おりたたむ'
						});
					}
				});

				//すべておりたたむ・すべてひろげる
				$('#fold-all').click((e) => {
					$(`.class_group:not([class*="${CLASSNAME_FOLDED}"]) .toggle_ent`).click();
					$('body, html').animate({scrollTop: 0});
				});
				$('#unfold-all').click((e) => {
					$('.' + CLASSNAME_FOLDED + ' .toggle_ent').click();
					$('body, html').animate({scrollTop: 0});
				});

				var bodyTop = $('#body_content').offset().top;

				//特定職業のみひろげる
				$('#foldbuttons-vocation a').click((e) => {
					var vocationId = $(e.currentTarget).attr('id').replace('fold-', '');
					$('body, html').animate({scrollTop: $('#' + vocationId).offset().top - bodyTop});
					if($('#' + vocationId).hasClass(CLASSNAME_FOLDED))
						$(`#${vocationId} .toggle_ent`).click();
				});
			},

			//レベル一括設定
			() => {
				//セレクトボックス初期化
				var $select = $('#setalllevel>select');
				for(var i = this.DB.consts.level.min; i <= this.DB.consts.level.max; i++) {
					$select.append($("<option />").val(i).text(i.toString()));
				}
				$select.val(this.DB.consts.level.max);

				$('#setalllevel>button').button().click((e) => {
					this.com.setAllLevel($select.val());
				});
			},

			//特訓スキルポイント一括設定（最大値固定）
			() => {
				$('#setalltrainingsp>button').button({
					icons: { primary: 'ui-icon-star' },
				}).click((e) => {
					this.com.setAllTrainingSkillPt(this.DB.consts.trainingSkillPts.max);
				});
			},

			//全スキルをリセット
			() => {
				$('#clearallskills>button').button({
					icons: { primary: 'ui-icon-refresh' },
				}).click((e) => {
					if(!window.confirm('全職業のすべてのスキルを振りなおします。\n（レベル・特訓のポイントは変わりません）'))
						return;

					this.com.clearAllSkills();
				});
			},

			//ナビゲーションボタン
			() => {
				$('a#hirobaimport').button({
					icons: { primary: 'ui-icon-arrowreturnthick-1-s'}
				});
				$('a#simpleui').button({
					icons: { primary: 'ui-icon-transfer-e-w'}
				}).click((e) => {
					var a = <HTMLAnchorElement>e.currentTarget;
					a.href = a.href.replace(/\?.+$/, '') + '?' +
						Base64.btoa(RawDeflate.deflate(this.sim.serialize()));
				});

			},

			//スキル選択時に同スキルを強調
			() => {
				$('.skill_table').click((e) => {
					var skillLineId = $(e.currentTarget).attr('class').split(' ')[0];
					$('.skill_table').removeClass('selected');
					$('.' + skillLineId).addClass('selected');
				});
			},

			//パッシブプリセット
			() => {
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

				$('#preset>button').button().click((e) => {
					this.com.presetStatus($select.val());
				});
			},

			//全職業のレベルを取得スキルに応じて引き上げ
			() => {
				$('#bringUpLevel>button').button({
					icons: { primary: 'ui-icon-arrowthickstop-1-n' },
				}).click((e) => {
					if(!window.confirm('全職業のレベルを現在の取得スキルに必要なところまで引き上げます。'))
						return;

					this.com.bringUpLevelToRequired();
				});
			},

			//undo/redo
			() => {
				var $undoButton = $('#undo');
				var $redoButton = $('#redo');

				$undoButton.button({
					icons: { primary: 'ui-icon-arrowreturnthick-1-w' },
					disabled: true
				}).click((e) => {
					this.hideConsoles();
					this.com.undo();
					this.refreshAll();
				});

				$redoButton.button({
					icons: { secondary: 'ui-icon-arrowreturnthick-1-e' },
					disabled: true
				}).click((e) => {
					this.hideConsoles();
					this.com.redo();
					this.refreshAll();
				});

				this.com.on('CommandStackChanged', () => {
					$undoButton.button('option', 'disabled', !this.com.isUndoable());
					$redoButton.button('option', 'disabled', !this.com.isRedoable());
				});

				shortcut.add('Ctrl+Z', () => $undoButton.click());
				shortcut.add('Ctrl+Y', () => $redoButton.click());
			}
		];
	}

	class CustomSkillSelector {
		private $dialog: JQuery;
		private $maskScreen: JQuery;
		private currentSkillLineId: string;
		private DB: SkillSimulatorDB;

		constructor(private sim: SimulatorModel, private com: SimulatorCommandManager) {
			this.DB = SimulatorDB;
		}

		setup() {
			this.$dialog = $('#customskill-selector');
			this.$maskScreen = $('#dark-screen');

			this.$maskScreen.click((e) => {
				this.hide();
			});
			$('#customskill-selector-close-button').click((e) => {
				this.hide();
			});

			//ヘッダー部ドラッグで画面移動可能
			this.$dialog.draggable({
				handle: '#customskill-selector-header',
				cursor: 'move'
			});

			this.$dialog.find('.customskill-entry-selector a').click((e) => {
				var $a = $(e.currentTarget);
				var skillLineId = $a.data('skillline');
				var customSkillId = $a.data('customskillId');
				var rank = $a.data('rank');

				this.setCustomSkill(customSkillId, rank);
			});

			//スキルライン選択ボタン
			this.$dialog.find('#customskill-selector-skillline-buttons a').click((e) => {
				var skillLineId = $(e.currentTarget).data('skillline');
				this.showEntryList(skillLineId);
				this.loadCustomPalette();
			});

			//パレット削除ボタン
			this.$dialog.find('a.customskill-palette-delete').click((e) => {
				var rank = $(e.currentTarget).data('rank');
				this.clearPalette(rank);
			});
		}

		private setCustomSkill(customSkillId: number, rank: number) {
			if(this.com.updateCustomSkill(this.currentSkillLineId, customSkillId, rank) == true)
				this.loadCustomPalette();
		}
		private showEntryList(skillLineId: string) {
			this.$dialog.find('.customskill-entrylist').hide();
			this.$dialog.find('#customskill-selector-entrylist-' + skillLineId).show();
			this.$dialog.find('#customskill-selector-skillline').text(this.DB.skillLines[skillLineId].name);
			this.currentSkillLineId = skillLineId;
		}
		private loadCustomPalette() {
			var skillLineId = this.currentSkillLineId;
			var skills = this.sim.getCustomSkills(skillLineId);
			this.$dialog.find(`#customskill-selector-entrylist-${skillLineId} .customskill-entry-selector a`).toggleClass('selected', false);
			skills.forEach((customId, rank) => {
				this.toggleEntrySelection(customId, rank, true);
				var customSkill = new SimulatorCustomSkill(skillLineId, customId);
				this.fillPalette(rank, customSkill);
			})
		}
		private clearPalette(rank: number) {
			var currentCustomSkillId = this.sim.getCustomSkills(this.currentSkillLineId)[rank];
			if(this.com.updateCustomSkill(this.currentSkillLineId, 0, rank) == true) {
				this.fillPalette(rank, SimulatorCustomSkill.emptySkill());
				this.toggleEntrySelection(currentCustomSkillId, rank, false);
			}
		}
		private fillPalette(rank: number, customSkill: SimulatorCustomSkill) {
			var $palette = $('#customskill-selector-palette-' + rank.toString());
			$palette.text(customSkill.getViewName(rank));
			$palette.attr('title', customSkill.getHintText(rank));
		}
		private toggleEntrySelection(customSkillId: number, rank: number, isSelected?: boolean) {
			$(`#customskill-selector-${this.currentSkillLineId}-${customSkillId}-${rank} a`).toggleClass('selected', isSelected);
		}

		show(skillLineId: string = 'sword') {
			this.showEntryList(skillLineId);
			this.loadCustomPalette();
			this.$maskScreen.show();
			this.$dialog.show();
		}
		private hide() {
			this.$dialog.hide();
			this.$maskScreen.hide();
		}
	}

	class SimpleUI {
		private CLASSNAME_SKILL_ENABLED = 'enabled';
		private CLASSNAME_ERROR = 'error';

		private sim: typeof Simulator;

		private $ptConsole: JQuery;
		private $lvConsole: JQuery;
		private $trainingPtConsole: JQuery;

		private DB: SkillSimulatorDB;

		constructor(sim: SimulatorModel) {
			this.sim = sim;
			this.DB = SimulatorDB;
		}
		private refreshAll() {
			this.refreshAllVocationInfo();
			Object.keys(this.DB.skillLines).forEach((skillLineId) => {
				this.refreshSkillList(skillLineId);
			});
			//refreshTotalRequiredExp();
			//refreshTotalExpRemain();
			// refreshTotalPassive();
			this.refreshControls();
			this.refreshSaveUrl();
		}

		private refreshVocationInfo(vocationId: string) {
			var currentLevel = this.sim.getLevel(vocationId);
			var requiredLevel = this.sim.requiredLevel(vocationId);

			//スキルポイント 残り / 最大値
			var maxSkillPts = this.sim.maxSkillPts(vocationId);
			var additionalSkillPts = this.sim.getTrainingSkillPt(vocationId);
			var remainingSkillPts = maxSkillPts + additionalSkillPts - this.sim.totalSkillPts(vocationId);

			$(`#${vocationId} .remain .container`).text(remainingSkillPts);
			$(`#${vocationId} .total .container`).text(maxSkillPts + additionalSkillPts);
			$(`#${vocationId} .level`).text(`Lv ${currentLevel} (${maxSkillPts}) + 特訓 (${additionalSkillPts})`);

			//Lv不足の処理
			var isLevelError = (isNaN(requiredLevel) || currentLevel < requiredLevel);
			$(`#${vocationId} .remain .container`).toggleClass(this.CLASSNAME_ERROR, isLevelError);
		}

		private refreshAllVocationInfo() {
			Object.keys(this.DB.vocations).forEach((vocationId) => {
				this.refreshVocationInfo(vocationId);
			});
			// $('#msp .remain .container').text(this.DB.consts.msp.max - this.sim.totalMSP());
			// $('#msp .total .container').text(this.DB.consts.msp.max);
		}

		private refreshTotalRequiredExp() {
			$('#total_exp').text(numToFormedStr(this.sim.totalRequiredExp()));
		}

		private refreshTotalExpRemain() {
			var totalExpRemain = this.sim.totalExpRemain();
			$('#total_exp_remain, #total_exp_remain_label').toggleClass(this.CLASSNAME_ERROR, totalExpRemain > 0);
			$('#total_exp_remain').text(numToFormedStr(totalExpRemain));
		}

		private refreshTotalPassive() {
			var status = 'maxhp,maxmp,pow,def,dex,spd,magic,heal,charm'.split(',');
			status.forEach((s) => $('#total_' + s).text(this.sim.totalStatus(s)));
		}

		private refreshSkillList(skillLineId: string) {
			var totalOfSkill = this.sim.totalOfSameSkills(skillLineId);
			$(`#footer .${skillLineId} .container`).text(totalOfSkill);

			var containerName = '#msp .' + skillLineId;
			if(this.DB.skillLines[skillLineId].unique) {
				Object.keys(this.DB.vocations).some((vocationId) => {
					if(this.DB.vocations[vocationId].skillLines.indexOf(skillLineId) >= 0) {
						containerName = '#' + vocationId + ' .msp';
						return true;
					}
					return false;
				});
			}

			// var msp = this.sim.getMSP(skillLineId);
			// $(containerName + ' .container').text(msp > 0 ? msp : '');
		}

		private refreshControls() {
			Object.keys(this.DB.vocations).forEach((vocationId) => {
				this.DB.vocations[vocationId].skillLines.forEach((skillLineId) => {
					this.refreshCurrentSkillPt(vocationId, skillLineId);
				})
			});
		}

		private refreshCurrentSkillPt(vocationId: string, skillLineId: string) {
			var containerName = skillLineId;
			if(this.DB.skillLines[skillLineId].unique) {
				//踊り子のパッシブ2種に対応
				if(skillLineId == 'song') {
					containerName = 'unique2';
				} else {
					containerName = 'unique';
				}
			}

			$(`#${vocationId} .${containerName} .container`)
				.text(this.sim.getSkillPt(vocationId, skillLineId));
		}

		private refreshSaveUrl() {
			var url = this.makeCurrentUrl();

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

		private refreshUrlBar() {
			if(window.history && window.history.replaceState) {
				var url = this.makeCurrentUrl();
				window.history.replaceState(url, null, url);
			}
		}

		private makeCurrentUrl() {
			return window.location.href.replace(window.location.search, "") + '?' +
				Base64.btoa(RawDeflate.deflate(this.sim.serialize()));

		}

		private getCurrentVocation(currentNode: HTMLElement) {
			return $(currentNode).parents('.class_group').attr('id');
		}

		private getCurrentSkillLine(currentNode: HTMLElement) {
			return $(currentNode).parents('.skill_table').attr('class').split(' ')[0];
		}

		setup() {
			this.setupFunctions.forEach((func) => func());
			this.refreshAll();
		}

		private setupFunctions = [

			//URLテキストボックスクリック・フォーカス時
			() => {
				$('#url_text').focus((e) => {
					this.refreshSaveUrl();
				}).click((e) => {
					$(e.currentTarget).select();
				});
			},

			//保存用URLツイートボタン設定
			() => {
				$('#tw-saveurl').button().click((e) => {
					this.refreshSaveUrl();

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
					var windowParam = $.map(windowParams, (val, key) => key + '=' + val).join(',');
					window.open((<HTMLAnchorElement>e.currentTarget).href, null, windowParam);

					return false;
				});
			},

			//ナビゲーションボタン
			() => {
				$('a#mainui').button({
					icons: { primary: 'ui-icon-transfer-e-w'}
				}).click((e) => {
					var a = <HTMLAnchorElement>e.currentTarget;
					a.href = a.href.replace(/\?.+$/, '') + '?' +
						Base64.btoa(RawDeflate.deflate(this.sim.serialize()));
				});
			}
		];
	}

	//ユーティリティ

	//数値を3桁区切りに整形
	function numToFormedStr(num: number) {
		if(isNaN(num)) return 'N/A';
		return num.toString().split(/(?=(?:\d{3})+$)/).join(',');
	}

(function($: JQueryStatic) {
	Simulator = new SimulatorModel();

	//データJSONを格納する変数
	var DATA_JSON_URI = window.location.href.replace(/\/[^\/]*$/, '/dq10skill-data.json');
	var $dbLoad = $.getJSON(DATA_JSON_URI, (data) => {
		//SimulatorDB = data;
	});

	//ロード時
	$(() => {
		function loadQuery() {
			var query = window.location.search.substring(1);
			if(Base64.isValid(query)) {
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
		}

		$dbLoad.done((data) => {
			SimulatorDB = data;
			Simulator.initialize();

			loadQuery();

			var ui = window.location.pathname.indexOf('/simple.html') > 0 ? new SimpleUI(Simulator) : new SimulatorUI(Simulator);
			ui.setup();
		});
	});
})(jQuery);
}
