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
		msp: number;
	}
	interface SkillPt {
		vocationId: string;
		skillLineId: string;
		pt: number;
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
		
		constructor() {
		}
		
		/* メソッド */
		//パラメータ初期化
		initialize() {
			this.DB = SimulatorDB;

			this.vocations = Object.keys(this.DB.vocations).map((vocationId) => {
				var vocation: VocationData = {
					id: vocationId,
					level: this.DB.consts.level.min,
					trainingSkillPt: this.DB.consts.trainingSkillPts.min,
					skillPts: []
				};
				this.skillPtDic[vocationId] = {};
				vocation.skillPts = this.DB.vocations[vocationId].skillLines.map((skillLineId) => {
					var pt: SkillPt = {
						vocationId: vocationId,
						skillLineId: skillLineId,
						pt: 0
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
					msp: this.DB.consts.msp.min
				}
				this.skillLineDic[skillLineId] = skillLine;
				return skillLine;
			});
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
		getMSP(skillLineId: string): number {
			return this.skillLineDic[skillLineId].msp;
		}

		//マスタースキルポイント更新
		updateMSP(skillLineId: string, newValue: number): boolean {
			var oldValue = this.skillLineDic[skillLineId].msp || 0;
			if(newValue < this.DB.consts.msp.min || newValue > this.DB.consts.msp.max)
				return false;
			if(this.totalMSP() - oldValue + newValue > this.DB.consts.msp.max)
				return false;
			if(this.totalOfSameSkills(skillLineId) - oldValue + newValue > this.DB.consts.skillPts.max)
				return false;

			this.skillLineDic[skillLineId].msp = newValue;
			return true;
		}

		//使用中のマスタースキルポイント合計
		totalMSP(): number {
			return this.skillLines.reduce((prev, skillLine) => prev + skillLine.msp, 0);
		}

		//職業のスキルポイント合計
		totalSkillPts(vocationId: string): number {
			return this.vocationDic[vocationId].skillPts.reduce((prev, skillPt) => {
				return prev + skillPt.pt;
			}, 0);
		}
		
		//同スキルのポイント合計
		totalOfSameSkills(skillLineId: string): number {
			var skillLine = this.skillLineDic[skillLineId];
			return skillLine.skillPts.reduce((prev, skillPt) => prev + skillPt.pt, 0) +
				skillLine.msp;
		}
		
		//特定スキルすべてを振り直し（0にセット）
		clearPtsOfSameSkills(skillLineId: string): boolean {
			var skillLine = this.skillLineDic[skillLineId];
			skillLine.skillPts.forEach((skillPt) => skillPt.pt = 0);
			skillLine.msp = 0;
			return true;
		}

		//MSPを初期化
		clearMSP(): boolean {
			this.skillLines.forEach((skillLine) => skillLine.msp = 0);
			return true;
		}
		
		//すべてのスキルを振り直し（0にセット）
		clearAllSkills() {
			this.wholePts.forEach((skillPt) => skillPt.pt = 0);
			this.clearMSP();
		}
		
		//職業レベルに対するスキルポイント最大値
		maxSkillPts(vocationId: string): number {
			return this.DB.skillPtsGiven[this.vocationDic[vocationId].level];
		}
		
		//スキルポイント合計に対する必要レベル取得
		requiredLevel(vocationId: string): number {
			var trainingSkillPt = this.getTrainingSkillPt(vocationId);
			var total = this.totalSkillPts(vocationId) - trainingSkillPt;
			
			for(var l = this.DB.consts.level.min; l <= this.DB.consts.level.max; l++) {
				if(this.DB.skillPtsGiven[l] >= total) {
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

		private VOCATIONS_DATA_ORDER = [
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
			'dancer'         //踊り子
		];

		serialize(): string {
			var serial = '';
			var toByte = String.fromCharCode;

			//先頭に職業の数を含める
			serial += toByte(this.VOCATIONS_DATA_ORDER.length);

			this.VOCATIONS_DATA_ORDER.forEach((vocationId) => {
				serial += toByte(this.getLevel(vocationId));
				serial += toByte(this.getTrainingSkillPt(vocationId));

				this.DB.vocations[vocationId].skillLines.forEach((skillLineId) => {
					serial += toByte(this.getSkillPt(vocationId, skillLineId));
				});
			});
			//末尾にMSPのスキルラインIDとポイントをペアで格納
			this.skillLines.forEach((skillLine) => {
				if(skillLine.msp > 0) {
					serial += toByte(this.DB.skillLines[skillLine.id].id) + toByte(skillLine.msp);
				}
			});
			return serial;
		}
		deserialize(serial: string): void {
			var cur = 0;
			var getData = () => serial.charCodeAt(cur++);
			
			//先頭に格納されている職業の数を取得
			var vocationCount = getData();

			for(var i = 0; i < vocationCount; i++) {
				var vocationId = this.VOCATIONS_DATA_ORDER[i];
				var vSkillLines = this.DB.vocations[vocationId].skillLines;

				if(serial.length - cur < 1 + 1 + vSkillLines.length)
					break;

				this.updateLevel(vocationId, getData());
				this.updateTrainingSkillPt(vocationId, getData());

				for(var s = 0; s < vSkillLines.length; s++) {
					this.updateSkillPt(vocationId, vSkillLines[s], getData());
				}
			}
			//末尾にデータがあればMSPとして取得
			var skillLineIds = [];
			Object.keys(this.DB.skillLines).forEach((skillLineId) => {
				skillLineIds[this.DB.skillLines[skillLineId].id] = skillLineId;
			});

			while(serial.length - cur >= 2) {
				var skillLineId = skillLineIds[getData()];
				var skillPt = getData();
				if(skillLineId !== undefined)
					this.updateMSP(skillLineId, skillPt);
			}
		}

		deserializeBit(serial: string): void {
			var BITS_LEVEL = 8; //レベルは8ビット確保
			var BITS_SKILL = 7; //スキルは7ビット
			var BITS_TRAINING = 7; //特訓スキルポイント7ビット
			
			var bitArray = [];
			for(var i = 0; i < serial.length; i++)
				bitArray = bitArray.concat(numToBitArray(serial.charCodeAt(i), 8));

			//特訓ポイントを含むかどうか: ビット列の長さで判断
			var isIncludingTrainingPts = bitArray.length >= (
				BITS_LEVEL +
				BITS_TRAINING +
				BITS_SKILL * this.DB.vocations[this.VOCATIONS_DATA_ORDER[0]].skillLines.length
			) * 10; //1.2VU（特訓モード実装）時点の職業数
			
			var cur = 0;
			this.VOCATIONS_DATA_ORDER.forEach((vocationId) => {
				this.updateLevel(vocationId, bitArrayToNum(bitArray.slice(cur, cur += BITS_LEVEL)));

				if(isIncludingTrainingPts)
					this.updateTrainingSkillPt(vocationId, bitArrayToNum(bitArray.slice(cur, cur += BITS_TRAINING)));
				else
					this.updateTrainingSkillPt(vocationId, 0);

				this.DB.vocations[vocationId].skillLines.forEach((skillLineId) => {
					this.updateSkillPt(vocationId, skillLineId, bitArrayToNum(bitArray.slice(cur, cur += BITS_SKILL)));
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

	class SimulatorUI {
		private CLASSNAME_SKILL_ENABLED = 'enabled';
		private CLASSNAME_ERROR = 'error';
		
		private sim: typeof Simulator;
		private com: SimulatorCommandManager;

		private $ptConsole: JQuery;
		private $lvConsole: JQuery;
		private $trainingPtConsole: JQuery;
		
		private mspMode = false; //MSP編集モードフラグ

		private DB: SkillSimulatorDB;
		
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
			var $skillPtsText = $(`#${vocationId} .pts`);
			$skillPtsText.text(remainingSkillPts + ' / ' + maxSkillPts);
			$('#training-' + vocationId).text(additionalSkillPts);
			
			//Lv不足の処理
			var isLevelError = (isNaN(requiredLevel) || currentLevel < requiredLevel);
			
			$levelH2.toggleClass(this.CLASSNAME_ERROR, isLevelError);
			$skillPtsText.toggleClass(this.CLASSNAME_ERROR, isLevelError);
			$(`#${vocationId} .error`).toggle(isLevelError);
			if(isLevelError) {
				$(`#${vocationId} .req_lv`).text(numToFormedStr(requiredLevel));
				$(`#${vocationId} .exp_remain`).text(numToFormedStr(this.sim.requiredExpRemain(vocationId)));
			}
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
			$('#msp_remain').text((this.DB.consts.msp.max - this.sim.totalMSP()).toString() + 'P');
		}
		
		private refreshSkillList(skillLineId: string) {
			$(`tr[class^=${skillLineId}_]`).removeClass(this.CLASSNAME_SKILL_ENABLED); //クリア
			var totalOfSkill = this.sim.totalOfSameSkills(skillLineId);
			this.DB.skillLines[skillLineId].skills.some((skill, i) => {
				if(totalOfSkill < skill.pt) return true;
				
				$(`.${skillLineId}_${i}`).addClass(this.CLASSNAME_SKILL_ENABLED);
				return false;
			});
			$(`.${skillLineId} .skill_total`).text(totalOfSkill);

			var msp = this.sim.getMSP(skillLineId);
			if(msp > 0)
				$(`<span>(${msp})</span>`)
					.addClass('msp')
					.appendTo(`.${skillLineId} .skill_total`);
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
					this.refreshAllVocationInfo();
					//refreshTotalExpRemain();
					this.refreshTotalSkillPt();
					this.refreshTotalPassive();
					this.refreshUrlBar();
				});
				this.com.on('MSPChanged', (skillLineId: string) => {
					this.refreshSkillList(skillLineId);
					this.refreshTotalPassive();
					this.refreshUrlBar();
				});
				this.com.on('WholeChanged', () => {
					this.refreshAll();
				});
			},

			//レベル選択セレクトボックス項目設定
			() => {
				this.$lvConsole = $('#lv_console');
				var $select = $('#lv-select');
				for(var i = this.DB.consts.level.min; i <= this.DB.consts.level.max; i++) {
					$select.append($("<option />").val(i).text(`${i} (${this.DB.skillPtsGiven[i]})`));
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
							this.com.updateMSP(skillLineId, ui.value) :
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
							this.sim.getMSP(skillLineId) :
							this.sim.getSkillPt(vocationId, skillLineId);

						if(isNaN(newValue)) {
							$(e.currentTarget).val(oldValue);
							return false;
						}
						
						newValue = parseInt(newValue, 10);
						if(newValue == oldValue)
							return false;

						var succeeded = this.mspMode ?
							this.com.updateMSP(skillLineId, newValue) :
							this.com.updateSkillPt(vocationId, skillLineId, newValue);

						if(!succeeded) {
							$(e.currentTarget).val(oldValue);
							return false;
						}
					},
					stop: (e, ui) => {
						var skillLineId = this.getCurrentSkillLine(e.currentTarget);
						this.selectSkillLine(skillLineId);
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
					$('#pt_spinner').val(this.mspMode ? this.sim.getMSP(skillLineId) : this.sim.getSkillPt(vocationId, skillLineId));

					//selectSkillLine(skillLineId);

					this.$ptConsole.show();
					e.stopPropagation();
				}).mouseleave((e) => {
					if($('#pt_spinner:focus').length === 0)
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
						this.com.updateMSP(skillLineId, 0);
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
						totalPtsOfOthers = this.sim.totalOfSameSkills(skillLineId) - this.sim.getMSP(skillLineId);
						if(requiredPt < totalPtsOfOthers) return;

						this.com.updateMSP(skillLineId, requiredPt - totalPtsOfOthers);
					} else {
						totalPtsOfOthers = this.sim.totalOfSameSkills(skillLineId) - this.sim.getSkillPt(vocationId, skillLineId);
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
			$('#msp .remain .container').text(this.DB.consts.msp.max - this.sim.totalMSP());
			$('#msp .total .container').text(this.DB.consts.msp.max);
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

			var msp = this.sim.getMSP(skillLineId);
			$(containerName + ' .container').text(msp > 0 ? msp : '');
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
		SimulatorDB = data;
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
		
		var ui = window.location.pathname.indexOf('/simple.html') > 0 ? new SimpleUI(Simulator) : new SimulatorUI(Simulator);

		$dbLoad.done((data) => {
			Simulator.initialize();

			loadQuery();
			ui.setup();
		});
	});
})(jQuery);
}
