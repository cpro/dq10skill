var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Dq10;
(function (Dq10) {
    var SkillSimulator;
    (function (SkillSimulator) {
        var EventDispatcher = (function () {
            function EventDispatcher() {
                this.events = {};
            }
            EventDispatcher.prototype.dispatch = function (eventName) {
                var _this = this;
                var args = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    args[_i - 1] = arguments[_i];
                }
                if (this.events[eventName] === undefined) {
                    return;
                }
                this.events[eventName].forEach(function (listener) {
                    listener.apply(_this, args);
                });
            };
            EventDispatcher.prototype.on = function (eventName, listener) {
                if (this.events[eventName] === undefined) {
                    this.events[eventName] = [];
                }
                this.events[eventName].push(listener);
            };
            EventDispatcher.prototype.off = function (eventName, listener) {
                if (this.events[eventName] === undefined) {
                    return;
                }
                var i = this.events[eventName].indexOf(listener);
                if (i >= 0) {
                    this.events[eventName].splice(i, 1);
                }
            };
            return EventDispatcher;
        }());
        SkillSimulator.EventDispatcher = EventDispatcher;
    })(SkillSimulator = Dq10.SkillSimulator || (Dq10.SkillSimulator = {}));
})(Dq10 || (Dq10 = {}));
/// <reference path="eventdispatcher.ts" />
var Dq10;
(function (Dq10) {
    var SkillSimulator;
    (function (SkillSimulator) {
        var UNDO_MAX = 20;
        var CommandManager = (function (_super) {
            __extends(CommandManager, _super);
            function CommandManager() {
                var _this = _super !== null && _super.apply(this, arguments) || this;
                _this.commandStack = [];
                _this.cursor = 0;
                return _this;
            }
            CommandManager.prototype.invoke = function (command) {
                var succeeded = command.execute();
                if (!succeeded)
                    return false;
                //イベント発行
                if (command.event !== undefined)
                    this.dispatch.apply(this, [command.event().name].concat(command.event().args));
                //以降のスタックを切捨て
                this.commandStack.splice(this.cursor);
                if (this.cursor >= 1 && this.commandStack[this.cursor - 1].isAbsorbable(command)) {
                    //連続した同種の操作ならひとつの操作にまとめる
                    this.commandStack[this.cursor - 1].absorb(command);
                }
                else {
                    this.commandStack.push(command);
                    this.cursor++;
                }
                if (this.commandStack.length > UNDO_MAX) {
                    this.commandStack.shift();
                    this.cursor--;
                }
                this.dispatch('CommandStackChanged');
                return true;
            };
            CommandManager.prototype.undo = function () {
                if (!this.isUndoable())
                    return;
                this.cursor--;
                var command = this.commandStack[this.cursor];
                command.undo();
                //イベント発行: undoEvent()が定義されていればそちらを優先
                var event = null;
                if (command.undoEvent !== undefined) {
                    event = command.undoEvent();
                }
                else if (command.event !== undefined) {
                    event = command.event();
                }
                if (event !== null)
                    this.dispatch.apply(this, [event.name].concat(event.args));
                this.dispatch('CommandStackChanged');
            };
            CommandManager.prototype.redo = function () {
                if (!this.isRedoable())
                    return;
                var command = this.commandStack[this.cursor];
                command.execute();
                if (command.event !== undefined)
                    this.dispatch.apply(this, [command.event().name].concat(command.event().args));
                this.cursor++;
                this.dispatch('CommandStackChanged');
            };
            CommandManager.prototype.isUndoable = function () {
                return (this.cursor > 0);
            };
            CommandManager.prototype.isRedoable = function () {
                return (this.cursor < this.commandStack.length);
            };
            return CommandManager;
        }(SkillSimulator.EventDispatcher));
        SkillSimulator.CommandManager = CommandManager;
    })(SkillSimulator = Dq10.SkillSimulator || (Dq10.SkillSimulator = {}));
})(Dq10 || (Dq10 = {}));
/**
 * @file dq10skill-command.ts のスキルシミュレータ用実装
 */
/// <reference path="dq10skill-command.ts" />
/// <reference path="dq10skill-main.ts" />
var Dq10;
(function (Dq10) {
    var SkillSimulator;
    (function (SkillSimulator) {
        var SingleValueCommand = (function () {
            function SingleValueCommand(newValue) {
                this.prevValue = undefined;
                this.name = 'SingleValueCommand';
                this.newValue = newValue;
            }
            SingleValueCommand.prototype.execute = function () {
                throw 'NotImplemented';
            };
            SingleValueCommand.prototype.undo = function () {
                throw 'NotImplemented';
            };
            SingleValueCommand.prototype.isAbsorbable = function (command) {
                return this.name === command.name &&
                    (this.vocationId === undefined || this.vocationId === command.vocationId) &&
                    (this.skillLineId === undefined || this.skillLineId === command.skillLineId);
            };
            SingleValueCommand.prototype.absorb = function (newCommand) {
                this.newValue = newCommand.newValue;
            };
            return SingleValueCommand;
        }());
        var UpdateSkillPt = (function (_super) {
            __extends(UpdateSkillPt, _super);
            function UpdateSkillPt(vocationId, skillLineId, newValue) {
                var _this = _super.call(this, newValue) || this;
                _this.name = 'UpdateSkillPt';
                _this.vocationId = vocationId;
                _this.skillLineId = skillLineId;
                return _this;
            }
            UpdateSkillPt.prototype.execute = function () {
                if (this.prevValue === undefined)
                    this.prevValue = SkillSimulator.Simulator.getSkillPt(this.vocationId, this.skillLineId);
                var ret = SkillSimulator.Simulator.updateSkillPt(this.vocationId, this.skillLineId, this.newValue);
                return ret;
            };
            UpdateSkillPt.prototype.undo = function () {
                SkillSimulator.Simulator.updateSkillPt(this.vocationId, this.skillLineId, this.prevValue);
            };
            UpdateSkillPt.prototype.event = function () {
                return {
                    name: 'SkillLineChanged',
                    args: [this.vocationId, this.skillLineId]
                };
            };
            return UpdateSkillPt;
        }(SingleValueCommand));
        var UpdateLevel = (function (_super) {
            __extends(UpdateLevel, _super);
            function UpdateLevel(vocationId, newValue) {
                var _this = _super.call(this, newValue) || this;
                _this.name = 'UpdateLevel';
                _this.vocationId = vocationId;
                return _this;
            }
            UpdateLevel.prototype.execute = function () {
                if (this.prevValue === undefined)
                    this.prevValue = SkillSimulator.Simulator.getLevel(this.vocationId);
                var ret = SkillSimulator.Simulator.updateLevel(this.vocationId, this.newValue);
                return ret;
            };
            UpdateLevel.prototype.undo = function () {
                SkillSimulator.Simulator.updateLevel(this.vocationId, this.prevValue);
            };
            UpdateLevel.prototype.event = function () {
                return {
                    name: 'VocationalInfoChanged',
                    args: [this.vocationId]
                };
            };
            return UpdateLevel;
        }(SingleValueCommand));
        var UpdateTrainingSkillPt = (function (_super) {
            __extends(UpdateTrainingSkillPt, _super);
            function UpdateTrainingSkillPt(vocationId, newValue) {
                var _this = _super.call(this, newValue) || this;
                _this.name = 'UpdateTrainingSkillPt';
                _this.vocationId = vocationId;
                return _this;
            }
            UpdateTrainingSkillPt.prototype.execute = function () {
                if (this.prevValue === undefined)
                    this.prevValue = SkillSimulator.Simulator.getTrainingSkillPt(this.vocationId);
                var ret = SkillSimulator.Simulator.updateTrainingSkillPt(this.vocationId, this.newValue);
                return ret;
            };
            UpdateTrainingSkillPt.prototype.undo = function () {
                SkillSimulator.Simulator.updateTrainingSkillPt(this.vocationId, this.prevValue);
            };
            UpdateTrainingSkillPt.prototype.event = function () {
                return {
                    name: 'VocationalInfoChanged',
                    args: [this.vocationId]
                };
            };
            return UpdateTrainingSkillPt;
        }(SingleValueCommand));
        var UpdateMSP = (function (_super) {
            __extends(UpdateMSP, _super);
            function UpdateMSP(vocationId, skillLineId, newValue) {
                var _this = _super.call(this, newValue) || this;
                _this.name = 'UpdateMSP';
                _this.vocationId = vocationId;
                _this.skillLineId = skillLineId;
                return _this;
            }
            UpdateMSP.prototype.execute = function () {
                if (this.prevValue === undefined)
                    this.prevValue = SkillSimulator.Simulator.getMSP(this.vocationId, this.skillLineId);
                var ret = SkillSimulator.Simulator.updateMSP(this.vocationId, this.skillLineId, this.newValue);
                return ret;
            };
            UpdateMSP.prototype.undo = function () {
                SkillSimulator.Simulator.updateMSP(this.vocationId, this.skillLineId, this.prevValue);
            };
            UpdateMSP.prototype.event = function () {
                return {
                    name: 'MSPChanged',
                    args: [this.vocationId, this.skillLineId]
                };
            };
            return UpdateMSP;
        }(SingleValueCommand));
        var UpdateCustomSkill = (function (_super) {
            __extends(UpdateCustomSkill, _super);
            function UpdateCustomSkill(skillLineId, newValue, rank) {
                var _this = _super.call(this, newValue) || this;
                _this.prevArray = [];
                _this.newArray = [];
                _this.name = 'UpdateCustomSkill';
                _this.skillLineId = skillLineId;
                _this.rank = rank;
                _this.prevArray = SkillSimulator.Simulator.getCustomSkills(_this.skillLineId).slice();
                _this.newArray = _this.prevArray.slice();
                _this.newArray[rank] = newValue;
                return _this;
            }
            UpdateCustomSkill.prototype.execute = function () {
                var ret = SkillSimulator.Simulator.setCustomSkills(this.skillLineId, this.newArray, this.rank);
                this.newArray = SkillSimulator.Simulator.getCustomSkills(this.skillLineId).slice();
                return ret;
            };
            UpdateCustomSkill.prototype.undo = function () {
                SkillSimulator.Simulator.setCustomSkills(this.skillLineId, this.prevArray, 0);
            };
            UpdateCustomSkill.prototype.absorb = function (newCommand) {
                this.newArray = newCommand.newArray.slice();
            };
            UpdateCustomSkill.prototype.event = function () {
                return {
                    name: 'CustomSkillChanged',
                    args: [this.skillLineId]
                };
            };
            return UpdateCustomSkill;
        }(SingleValueCommand));
        var PackageCommand = (function () {
            function PackageCommand() {
                this.name = '';
            }
            PackageCommand.prototype.execute = function () {
                if (this.prevSerial === undefined)
                    this.prevSerial = SkillSimulator.Simulator.serialize();
                var succeeded = this._impl();
                if (!succeeded) {
                    SkillSimulator.Simulator.deserialize(this.prevSerial);
                    return false;
                }
                return true;
            };
            PackageCommand.prototype.undo = function () {
                SkillSimulator.Simulator.deserialize(this.prevSerial);
            };
            PackageCommand.prototype.isAbsorbable = function (command) {
                return false;
            };
            PackageCommand.prototype.absorb = function (newCommand) {
                throw 'IllegalOperation';
            };
            PackageCommand.prototype._impl = function () {
                throw 'NotImplemented';
            };
            PackageCommand.prototype.event = function () {
                return {
                    name: 'WholeChanged',
                    args: []
                };
            };
            return PackageCommand;
        }());
        var SetAllLevel = (function (_super) {
            __extends(SetAllLevel, _super);
            function SetAllLevel(newValue) {
                var _this = _super.call(this) || this;
                _this.newValue = newValue;
                return _this;
            }
            SetAllLevel.prototype._impl = function () {
                var _this = this;
                return Object.keys(SkillSimulator.SimulatorDB.vocations).every(function (vocationId) {
                    return SkillSimulator.Simulator.updateLevel(vocationId, _this.newValue);
                });
            };
            return SetAllLevel;
        }(PackageCommand));
        var SetAllTrainingSkillPt = (function (_super) {
            __extends(SetAllTrainingSkillPt, _super);
            function SetAllTrainingSkillPt(newValue) {
                var _this = _super.call(this) || this;
                _this.newValue = newValue;
                return _this;
            }
            SetAllTrainingSkillPt.prototype._impl = function () {
                var _this = this;
                return Object.keys(SkillSimulator.SimulatorDB.vocations).every(function (vocationId) {
                    return SkillSimulator.Simulator.updateTrainingSkillPt(vocationId, _this.newValue);
                });
            };
            return SetAllTrainingSkillPt;
        }(PackageCommand));
        var ClearPtsOfSameSkills = (function (_super) {
            __extends(ClearPtsOfSameSkills, _super);
            function ClearPtsOfSameSkills(skillLineId) {
                var _this = _super.call(this) || this;
                _this.skillLineId = skillLineId;
                return _this;
            }
            ClearPtsOfSameSkills.prototype._impl = function () {
                SkillSimulator.Simulator.clearPtsOfSameSkills(this.skillLineId);
                return true;
            };
            return ClearPtsOfSameSkills;
        }(PackageCommand));
        var ClearMSP = (function (_super) {
            __extends(ClearMSP, _super);
            function ClearMSP() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            ClearMSP.prototype._impl = function () {
                SkillSimulator.Simulator.clearMSP();
                return true;
            };
            return ClearMSP;
        }(PackageCommand));
        var ClearAllSkills = (function (_super) {
            __extends(ClearAllSkills, _super);
            function ClearAllSkills() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            ClearAllSkills.prototype._impl = function () {
                SkillSimulator.Simulator.clearAllSkills();
                return true;
            };
            return ClearAllSkills;
        }(PackageCommand));
        var PresetStatus = (function (_super) {
            __extends(PresetStatus, _super);
            function PresetStatus(status) {
                var _this = _super.call(this) || this;
                _this.status = status;
                return _this;
            }
            PresetStatus.prototype._impl = function () {
                var sarray = this.status.split(';');
                return sarray.reduce(function (succeeded, s) { return SkillSimulator.Simulator.presetStatus(s) || succeeded; }, false);
            };
            return PresetStatus;
        }(PackageCommand));
        var BringUpLevelToRequired = (function (_super) {
            __extends(BringUpLevelToRequired, _super);
            function BringUpLevelToRequired() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            BringUpLevelToRequired.prototype._impl = function () {
                SkillSimulator.Simulator.bringUpLevelToRequired();
                return true;
            };
            return BringUpLevelToRequired;
        }(PackageCommand));
        var SimulatorCommandManager = (function (_super) {
            __extends(SimulatorCommandManager, _super);
            function SimulatorCommandManager() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            SimulatorCommandManager.prototype.updateSkillPt = function (vocationId, skillLineId, newValue) {
                return this.invoke(new UpdateSkillPt(vocationId, skillLineId, newValue));
            };
            SimulatorCommandManager.prototype.updateLevel = function (vocationId, newValue) {
                return this.invoke(new UpdateLevel(vocationId, newValue));
            };
            SimulatorCommandManager.prototype.setAllLevel = function (newValue) {
                return this.invoke(new SetAllLevel(newValue));
            };
            SimulatorCommandManager.prototype.updateTrainingSkillPt = function (vocationId, newValue) {
                return this.invoke(new UpdateTrainingSkillPt(vocationId, newValue));
            };
            SimulatorCommandManager.prototype.setAllTrainingSkillPt = function (newValue) {
                return this.invoke(new SetAllTrainingSkillPt(newValue));
            };
            SimulatorCommandManager.prototype.updateMSP = function (vocationId, skillLineId, newValue) {
                return this.invoke(new UpdateMSP(vocationId, skillLineId, newValue));
            };
            SimulatorCommandManager.prototype.updateCustomSkill = function (skillLineId, newValue, rank) {
                return this.invoke(new UpdateCustomSkill(skillLineId, newValue, rank));
            };
            SimulatorCommandManager.prototype.clearPtsOfSameSkills = function (skillLineId) {
                return this.invoke(new ClearPtsOfSameSkills(skillLineId));
            };
            SimulatorCommandManager.prototype.clearMSP = function () {
                return this.invoke(new ClearMSP());
            };
            SimulatorCommandManager.prototype.clearAllSkills = function () {
                return this.invoke(new ClearAllSkills());
            };
            SimulatorCommandManager.prototype.presetStatus = function (status) {
                return this.invoke(new PresetStatus(status));
            };
            SimulatorCommandManager.prototype.bringUpLevelToRequired = function () {
                return this.invoke(new BringUpLevelToRequired());
            };
            return SimulatorCommandManager;
        }(SkillSimulator.CommandManager));
        SkillSimulator.SimulatorCommandManager = SimulatorCommandManager;
    })(SkillSimulator = Dq10.SkillSimulator || (Dq10.SkillSimulator = {}));
})(Dq10 || (Dq10 = {}));
/**
 * Base64 URI safe
 * [^\x00-\xFF]な文字しか来ない前提
 */
var Base64 = (function () {
    function Base64() {
    }
    /**
     * btoa
     */
    Base64.btoa = function (b) {
        return window.btoa(b)
            .replace(/[+\/]/g, function (m0) { return m0 == '+' ? '-' : '_'; })
            .replace(/=/g, '');
    };
    /**
     * atob
     */
    Base64.atob = function (a) {
        a = a.replace(/[-_]/g, function (m0) { return m0 == '-' ? '+' : '/'; });
        if (a.length % 4 == 1)
            a += 'A';
        return window.atob(a);
    };
    /**
     * isValid
     */
    Base64.isValid = function (a) {
        return (/^[A-Za-z0-9-_]+$/).test(a);
    };
    return Base64;
}());
/**
 * 通常のUnicode文字列とUTF-8バイト列の相互変換
 * Base64とのデータ受渡に使用
 */
var UTF8 = (function () {
    function UTF8() {
    }
    UTF8.toUTF8 = function (raw) {
        return unescape(encodeURIComponent(raw));
    };
    UTF8.fromUTF8 = function (utf8) {
        return decodeURIComponent(escape(utf8));
    };
    return UTF8;
}());
/// <reference path="typings/jquery/jquery.d.ts" />
/// <reference path="typings/jqueryui/jqueryui.d.ts" />
/// <reference path="typings/dq10skill.d.ts" />
/// <reference path="typings/rawdeflate.d.ts" />
/// <reference path="typings/shortcut.d.ts" />
/// <reference path="dq10skill-simulatorcommand.ts" />
/// <reference path="base64.ts" />
var Dq10;
(function (Dq10) {
    var SkillSimulator;
    (function (SkillSimulator) {
        var SimulatorModel = (function () {
            function SimulatorModel() {
                //パラメータ格納用
                this.vocations = [];
                this.vocationDic = {};
                this.skillLines = [];
                this.skillLineDic = {};
                /** 全スキルポイント情報を保持する配列 */
                this.wholePts = [];
                this.skillPtDic = {};
            }
            /* メソッド */
            //パラメータ初期化
            SimulatorModel.prototype.initialize = function () {
                var _this = this;
                this.DB = SkillSimulator.SimulatorDB;
                this.vocations = Object.keys(this.DB.vocations).map(function (vocationId) {
                    var vocation = {
                        id: vocationId,
                        level: _this.DB.consts.level.min,
                        trainingSkillPt: _this.DB.consts.trainingSkillPts.min,
                        skillPts: []
                    };
                    _this.skillPtDic[vocationId] = {};
                    vocation.skillPts = _this.DB.vocations[vocationId].skillLines.map(function (skillLineId) {
                        var pt = {
                            vocationId: vocationId,
                            skillLineId: skillLineId,
                            pt: 0,
                            msp: _this.DB.consts.msp.min
                        };
                        _this.skillPtDic[vocationId][skillLineId] = pt;
                        return pt;
                    });
                    _this.wholePts = _this.wholePts.concat(vocation.skillPts);
                    _this.vocationDic[vocationId] = vocation;
                    return vocation;
                });
                this.skillLines = Object.keys(this.DB.skillLines).map(function (skillLineId) {
                    var skillLine = {
                        id: skillLineId,
                        skillPts: _this.wholePts.filter(function (skillPt) { return skillPt.skillLineId == skillLineId; }),
                        custom: [0, 0, 0]
                    };
                    _this.skillLineDic[skillLineId] = skillLine;
                    return skillLine;
                });
            };
            //スキルポイント取得
            SimulatorModel.prototype.getSkillPt = function (vocationId, skillLineId) {
                return this.skillPtDic[vocationId][skillLineId].pt;
            };
            //スキルポイント更新：不正値の場合falseを返す
            SimulatorModel.prototype.updateSkillPt = function (vocationId, skillLineId, newValue) {
                var skillPt = this.skillPtDic[vocationId][skillLineId];
                var oldValue = skillPt.pt;
                if (newValue < this.DB.consts.skillPts.min || newValue > this.DB.consts.skillPts.max) {
                    return false;
                }
                if (this.totalOfSameSkills(skillLineId) - oldValue + newValue > this.DB.consts.skillPts.max) {
                    return false;
                }
                skillPt.pt = newValue;
                return true;
            };
            //レベル値取得
            SimulatorModel.prototype.getLevel = function (vocationId) {
                return this.vocationDic[vocationId].level;
            };
            //レベル値更新
            SimulatorModel.prototype.updateLevel = function (vocationId, newValue) {
                if (newValue < this.DB.consts.level.min || newValue > this.DB.consts.level.max) {
                    return false;
                }
                this.vocationDic[vocationId].level = newValue;
                return true;
            };
            //特訓スキルポイント取得
            SimulatorModel.prototype.getTrainingSkillPt = function (vocationId) {
                return this.vocationDic[vocationId].trainingSkillPt;
            };
            //特訓スキルポイント更新
            SimulatorModel.prototype.updateTrainingSkillPt = function (vocationId, newValue) {
                if (newValue < this.DB.consts.trainingSkillPts.min || newValue > this.DB.consts.trainingSkillPts.max)
                    return false;
                this.vocationDic[vocationId].trainingSkillPt = newValue;
                return true;
            };
            //マスタースキルポイント取得
            SimulatorModel.prototype.getMSP = function (vocationId, skillLineId) {
                return this.skillPtDic[vocationId][skillLineId].msp;
            };
            //マスタースキルポイント更新
            SimulatorModel.prototype.updateMSP = function (vocationId, skillLineId, newValue) {
                var oldValue = this.skillPtDic[vocationId][skillLineId].msp;
                if (newValue < this.DB.consts.msp.min || newValue > this.DB.consts.msp.max)
                    return false;
                this.skillPtDic[vocationId][skillLineId].msp = newValue;
                return true;
            };
            //使用中のマスタースキルポイント合計
            SimulatorModel.prototype.totalMSP = function (vocationId) {
                return this.vocationDic[vocationId].skillPts.reduce(function (prev, skillPt) {
                    return prev + skillPt.msp;
                }, 0);
            };
            //職業のスキルポイント合計
            SimulatorModel.prototype.totalSkillPts = function (vocationId) {
                return this.vocationDic[vocationId].skillPts.reduce(function (prev, skillPt) {
                    return prev + skillPt.pt;
                }, 0);
            };
            //同スキルのポイント合計 MSPは含まない
            SimulatorModel.prototype.totalOfSameSkills = function (skillLineId) {
                var skillLine = this.skillLineDic[skillLineId];
                return skillLine.skillPts.reduce(function (prev, skillPt) { return prev + skillPt.pt; }, 0);
            };
            //特定スキルすべてを振り直し（0にセット）
            SimulatorModel.prototype.clearPtsOfSameSkills = function (skillLineId) {
                var _this = this;
                var skillLine = this.skillLineDic[skillLineId];
                skillLine.skillPts.forEach(function (skillPt) {
                    skillPt.pt = 0;
                    skillPt.msp = _this.DB.consts.msp.min;
                });
                return true;
            };
            //MSPを初期化
            SimulatorModel.prototype.clearMSP = function () {
                this.wholePts.forEach(function (skillPt) { return skillPt.msp = 0; });
                return true;
            };
            SimulatorModel.prototype.clearVocationMSP = function (vocationId) {
                this.vocationDic[vocationId].skillPts.forEach(function (skillPt) { return skillPt.msp = 0; });
                return true;
            };
            //すべてのスキルを振り直し（0にセット）
            SimulatorModel.prototype.clearAllSkills = function () {
                this.wholePts.forEach(function (skillPt) { return skillPt.pt = 0; });
                this.clearMSP();
            };
            //職業レベルに対するスキルポイント最大値
            SimulatorModel.prototype.maxSkillPts = function (vocationId) {
                return this.DB.skillPtsGiven[this.vocationDic[vocationId].level];
            };
            //スキルポイント合計に対する必要レベル取得
            SimulatorModel.prototype.requiredLevel = function (vocationId) {
                var trainingSkillPt = this.getTrainingSkillPt(vocationId);
                var total = this.totalSkillPts(vocationId) - trainingSkillPt;
                for (var l = this.DB.consts.level.min; l <= this.DB.consts.level.max; l++) {
                    if (this.DB.skillPtsGiven[l] >= total) {
                        //特訓スキルポイントが1以上の場合、最低レベル50必要
                        if (trainingSkillPt > this.DB.consts.trainingSkillPts.min && l < this.DB.consts.level.forTrainingMode)
                            return this.DB.consts.level.forTrainingMode;
                        else
                            return l;
                    }
                }
                return NaN;
            };
            //全職業の使用可能スキルポイント
            SimulatorModel.prototype.wholeSkillPtsAvailable = function () {
                var _this = this;
                return this.vocations.reduce(function (prev, vocation) {
                    var cur = _this.maxSkillPts(vocation.id) + _this.getTrainingSkillPt(vocation.id);
                    return prev + cur;
                }, 0);
            };
            //全職業の使用済スキルポイント
            SimulatorModel.prototype.wholeSkillPtsUsed = function () {
                return this.wholePts.reduce(function (prev, skillPt) { return prev + skillPt.pt; }, 0);
            };
            //職業・レベルによる必要経験値
            SimulatorModel.prototype.requiredExp = function (vocationId, level) {
                return this.DB.expRequired[this.DB.vocations[vocationId].expTable][level];
            };
            //不足経験値
            SimulatorModel.prototype.requiredExpRemain = function (vocationId) {
                var required = this.requiredLevel(vocationId);
                var current = this.vocationDic[vocationId].level;
                if (required <= current)
                    return 0;
                var remain = this.requiredExp(vocationId, required) - this.requiredExp(vocationId, current);
                return remain;
            };
            //全職業の必要経験値合計
            SimulatorModel.prototype.totalRequiredExp = function () {
                var _this = this;
                return this.vocations.reduce(function (prev, vocation) {
                    var cur = _this.requiredExp(vocation.id, vocation.level);
                    return prev + cur;
                }, 0);
            };
            //全職業の不足経験値合計
            SimulatorModel.prototype.totalExpRemain = function () {
                var _this = this;
                return this.vocations.reduce(function (prev, vocation) {
                    var cur = _this.requiredExpRemain(vocation.id);
                    return prev + cur;
                }, 0);
            };
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
            SimulatorModel.prototype.totalStatus = function (status) {
                var _this = this;
                //スキルラインデータの各スキルから上記プロパティを調べ合計する
                return this.skillLines.reduce(function (wholeTotal, skillLine) {
                    var totalPts = _this.totalOfSameSkills(skillLine.id);
                    var cur = _this.DB.skillLines[skillLine.id].skills.filter(function (skill) {
                        return skill.pt <= totalPts && skill[status];
                    }).reduce(function (skillLineTotal, skill) {
                        return skillLineTotal + skill[status];
                    }, 0);
                    return wholeTotal + cur;
                }, 0);
            };
            //特定のパッシブスキルをすべて取得済みの状態にする
            //ステータスが変動した場合trueを返す
            SimulatorModel.prototype.presetStatus = function (status) {
                var _this = this;
                var returnValue = false;
                this.vocations.forEach(function (vocation) {
                    _this.DB.vocations[vocation.id].skillLines.forEach(function (skillLineId) {
                        if (!_this.DB.skillLines[skillLineId].unique)
                            return;
                        var currentPt = _this.getSkillPt(vocation.id, skillLineId);
                        var skills = _this.DB.skillLines[skillLineId].skills.filter(function (skill) {
                            return skill.pt > currentPt && skill[status];
                        });
                        if (skills.length > 0) {
                            _this.updateSkillPt(vocation.id, skillLineId, skills[skills.length - 1].pt);
                            returnValue = true;
                        }
                    });
                });
                return returnValue;
            };
            //現在のレベルを取得スキルに対する必要レベルにそろえる
            SimulatorModel.prototype.bringUpLevelToRequired = function () {
                var _this = this;
                this.vocations.forEach(function (vocation) {
                    var required = _this.requiredLevel(vocation.id);
                    if (vocation.level < required)
                        _this.updateLevel(vocation.id, required);
                });
                return true;
            };
            SimulatorModel.prototype.getCustomSkills = function (skillLineId) {
                return this.skillLineDic[skillLineId].custom;
            };
            SimulatorModel.prototype.setCustomSkills = function (skillLineId, customIds, rank) {
                if (customIds.length != this.skillLineDic[skillLineId].custom.length)
                    return false;
                for (var r = 0; r < this.DB.consts.customSkill.count; r++) {
                    //設定しようとしているランク以外に同じカスタムスキルが設定されていたらそれを解除する
                    if (r != rank && customIds[r] == customIds[rank])
                        this.skillLineDic[skillLineId].custom[r] = 0;
                    else
                        this.skillLineDic[skillLineId].custom[r] = customIds[r];
                }
                return true;
            };
            SimulatorModel.prototype.serialize = function () {
                var serial = new SimulatorSaveData.Serializer().exec(this);
                return serial;
            };
            SimulatorModel.prototype.deserialize = function (serial) {
                new SimulatorSaveData.Deserializer(serial).exec(this);
            };
            SimulatorModel.prototype.deserializeBit = function (serial) {
                new SimulatorSaveData.Deserializer(serial, true).exec(this);
            };
            return SimulatorModel;
        }());
        SkillSimulator.SimulatorModel = SimulatorModel;
        var SimulatorSaveData;
        (function (SimulatorSaveData) {
            var VOCATIONS_DATA_ORDER = [
                'warrior',
                'priest',
                'mage',
                'martialartist',
                'thief',
                'minstrel',
                'ranger',
                'paladin',
                'armamentalist',
                'luminary',
                'gladiator',
                'sage',
                'monstermaster',
                'itemmaster',
                'dancer',
                'fortuneteller' //占い師
            ];
            var BITS_LEVEL = 8; //レベルは8ビット確保
            var BITS_SKILL = 7; //スキルは7ビット
            var BITS_TRAINING = 7; //特訓スキルポイント7ビット
            /** 最初期の独自ビット圧縮していたバージョン */
            var VERSION_FIRST = 1;
            /** バージョン番号管理開始以前のバージョン */
            var VERSION_UNMANAGED = 2;
            /** MSPが職業ごとの管理になったバージョン */
            var VERSION_VOCATIONAL_MSP = 4;
            /** 現在のSerializerのバージョン */
            var VERSION_CURRENT_SERIALIZER = 4;
            var Serializer = (function () {
                function Serializer() {
                }
                Serializer.prototype.exec = function (sim) {
                    var DB = SkillSimulator.SimulatorDB;
                    var serial = '';
                    var toByte = String.fromCharCode;
                    // バージョン番号
                    serial += toByte(this.createVersionByteData());
                    //先頭に職業の数を含める
                    serial += toByte(VOCATIONS_DATA_ORDER.length);
                    VOCATIONS_DATA_ORDER.forEach(function (vocationId) {
                        serial += toByte(sim.getLevel(vocationId));
                        serial += toByte(sim.getTrainingSkillPt(vocationId));
                        DB.vocations[vocationId].skillLines.forEach(function (skillLineId) {
                            serial += toByte(sim.getSkillPt(vocationId, skillLineId));
                            serial += toByte(sim.getMSP(vocationId, skillLineId));
                        });
                    });
                    // カスタムスキルデータ長を格納
                    serial += toByte(DB.consts.customSkill.count);
                    //末尾にスキルライン別データ（MSP、カスタムスキル）をIDとペアで格納
                    Object.keys(DB.skillLines).forEach(function (skillLineId) {
                        var customSkills = sim.getCustomSkills(skillLineId);
                        // MSP・カスタムスキルいずれかに0でない値が入っている場合のみ格納
                        if (customSkills.some(function (val) { return val > 0; })) {
                            serial += toByte(DB.skillLines[skillLineId].id);
                            serial += customSkills.map(function (val) { return toByte(val); }).join('');
                        }
                    });
                    return serial;
                };
                /** 現在のバージョン番号の最上位ビットにバージョン管理フラグとして1を立てる */
                Serializer.prototype.createVersionByteData = function () {
                    return (VERSION_CURRENT_SERIALIZER | 0x80);
                };
                return Serializer;
            }());
            SimulatorSaveData.Serializer = Serializer;
            var Deserializer = (function () {
                function Deserializer(serial, isFirstVersion) {
                    if (isFirstVersion === void 0) { isFirstVersion = false; }
                    this.serial = serial;
                    this.isFirstVersion = isFirstVersion;
                }
                Deserializer.prototype.exec = function (sim) {
                    var _this = this;
                    var cur = 0;
                    var getData = function () { return _this.serial.charCodeAt(cur++); };
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
                    var DB = SkillSimulator.SimulatorDB;
                    //先頭に格納されている職業の数を取得
                    var vocationCount = getData();
                    for (var i = 0; i < vocationCount; i++) {
                        var vocationId = VOCATIONS_DATA_ORDER[i];
                        var vSkillLines = DB.vocations[vocationId].skillLines;
                        if (this.serial.length - cur < 1 + 1 + vSkillLines.length)
                            break;
                        sim.updateLevel(vocationId, getData());
                        sim.updateTrainingSkillPt(vocationId, getData());
                        for (var s = 0; s < vSkillLines.length; s++) {
                            sim.updateSkillPt(vocationId, vSkillLines[s], getData());
                            if (version >= VERSION_VOCATIONAL_MSP)
                                sim.updateMSP(vocationId, vSkillLines[s], getData());
                        }
                    }
                    // スキルラインのid番号からID文字列を得るための配列作成
                    var skillLineIds = [];
                    Object.keys(DB.skillLines).forEach(function (skillLineId) {
                        skillLineIds[DB.skillLines[skillLineId].id] = skillLineId;
                    });
                    var skillLineCount;
                    var customSkillLength;
                    var skillLineDataLength;
                    if (version === VERSION_UNMANAGED)
                        customSkillLength = 0;
                    else
                        customSkillLength = getData();
                    skillLineDataLength = customSkillLength + 2; //スキルライン番号1byte+MSP1byte+カスタムスキルデータ長
                    // スキルライン別データ取得（MSP、カスタムスキル）
                    while (this.serial.length - cur >= skillLineDataLength) {
                        var skillLineId = skillLineIds[getData()];
                        if (version < VERSION_VOCATIONAL_MSP) {
                            var skillPt = getData();
                            if (skillLineId !== undefined) {
                                Object.keys(DB.vocations).filter(function (vocationId) {
                                    return DB.vocations[vocationId].skillLines.indexOf(skillLineId) >= 0;
                                }).forEach(function (vocationId) {
                                    sim.updateMSP(vocationId, skillLineId, skillPt);
                                });
                            }
                        }
                        var customIds = [];
                        for (var i = 0; i < customSkillLength; i++) {
                            customIds.push(getData());
                        }
                        sim.setCustomSkills(skillLineId, customIds, 0);
                    }
                };
                Deserializer.prototype.judgeVersion = function () {
                    // コンストラクタで初期バージョンのスイッチが与えられている場合
                    if (this.isFirstVersion)
                        return VERSION_FIRST;
                    // 最上位ビットに1が立っていなければバージョン管理前と判定する
                    // （管理前は先頭バイトに職業の数（15以下）を格納していたので、必ず0となる）
                    var firstByte = this.serial.charCodeAt(0);
                    if ((firstByte & 0x80) === 0)
                        return VERSION_UNMANAGED;
                    // 先頭ビットを除去したものをバージョン番号とする
                    return (firstByte & 0x7f);
                };
                Deserializer.prototype.execAsFirstVersion = function (sim) {
                    var DB = SkillSimulator.SimulatorDB;
                    var bitArray = [];
                    for (var i = 0; i < this.serial.length; i++)
                        bitArray = bitArray.concat(numToBitArray(this.serial.charCodeAt(i), 8));
                    //特訓ポイントを含むかどうか: ビット列の長さで判断
                    var isIncludingTrainingPts = bitArray.length >= (BITS_LEVEL +
                        BITS_TRAINING +
                        BITS_SKILL * DB.vocations[VOCATIONS_DATA_ORDER[0]].skillLines.length) * 10; //1.2VU（特訓モード実装）時点の職業数
                    var cur = 0;
                    VOCATIONS_DATA_ORDER.forEach(function (vocationId) {
                        sim.updateLevel(vocationId, bitArrayToNum(bitArray.slice(cur, cur += BITS_LEVEL)));
                        if (isIncludingTrainingPts)
                            sim.updateTrainingSkillPt(vocationId, bitArrayToNum(bitArray.slice(cur, cur += BITS_TRAINING)));
                        else
                            sim.updateTrainingSkillPt(vocationId, 0);
                        DB.vocations[vocationId].skillLines.forEach(function (skillLineId) {
                            sim.updateSkillPt(vocationId, skillLineId, bitArrayToNum(bitArray.slice(cur, cur += BITS_SKILL)));
                        });
                    });
                    function bitArrayToNum(bitArray) {
                        return bitArray.reduce(function (prev, bit) { return prev << 1 | bit; }, 0);
                    }
                    function numToBitArray(num, digits) {
                        var bitArray = [];
                        for (var i = digits - 1; i >= 0; i--) {
                            bitArray.push(num >> i & 1);
                        }
                        return bitArray;
                    }
                };
                return Deserializer;
            }());
            SimulatorSaveData.Deserializer = Deserializer;
        })(SimulatorSaveData || (SimulatorSaveData = {}));
        var SimulatorCustomSkill = (function () {
            function SimulatorCustomSkill(skillLineId, customSkillId) {
                if (skillLineId === undefined ||
                    skillLineId === null ||
                    SkillSimulator.SimulatorDB.skillLines[skillLineId].customSkills === undefined) {
                    this.data = SimulatorCustomSkill.emptySkillData;
                }
                else {
                    this.data = SkillSimulator.SimulatorDB.skillLines[skillLineId].customSkills.filter(function (custom) { return custom.id == customSkillId; })[0];
                    if (this.data === undefined) {
                        this.data = SimulatorCustomSkill.emptySkillData;
                    }
                }
            }
            SimulatorCustomSkill.emptySkill = function () {
                return new SimulatorCustomSkill();
            };
            SimulatorCustomSkill.prototype.getName = function () {
                return this.data.name;
            };
            SimulatorCustomSkill.prototype.getViewName = function (rank) {
                return this.replaceRankValue(this.data.viewName, rank);
            };
            SimulatorCustomSkill.prototype.getSelectorName = function (rank) {
                return this.replaceRankValue(this.data.selectorName, rank);
            };
            SimulatorCustomSkill.prototype.replaceRankValue = function (template, rank) {
                var ret = template;
                var rankName = 'ⅠⅡⅢ'.charAt(rank);
                ret = ret.replace('%r', rankName);
                var rankValue = this.data.val[rank];
                ret = ret.replace('%i', rankValue.toFixed(0)) //整数値
                    .replace('%f', rankValue.toFixed(1)); //小数値
                return ret;
            };
            SimulatorCustomSkill.prototype.getHintText = function (rank) {
                var FULLWIDTH_ADJUSTER = 0xFEE0;
                var hint = this.data.desc;
                var rankValue = this.data.val[rank];
                var rankValFullWidth = rankValue.toString().replace(/[0-9.]/g, function (m) {
                    return String.fromCharCode(m.charCodeAt(0) + 0xFEE0);
                });
                hint = hint.replace('%z', rankValFullWidth);
                if ((this.data.mp !== null) && (this.data.mp !== undefined))
                    hint += "\n\uFF08\u6D88\u8CBBMP: " + this.data.mp + "\uFF09";
                if ((this.data.charge !== null) && (this.data.charge !== undefined))
                    hint += "\n\uFF08\u30C1\u30E3\u30FC\u30B8: " + rankValue + "\u79D2\uFF09";
                return hint;
            };
            return SimulatorCustomSkill;
        }());
        SimulatorCustomSkill.emptySkillData = {
            id: 0,
            name: '（なし）',
            viewName: '（なし）',
            selectorName: '',
            desc: '',
            mp: null,
            charge: null,
            atk: null,
            val: [0, 0, 0]
        };
        var SimulatorUI = (function () {
            function SimulatorUI(sim) {
                var _this = this;
                this.CLASSNAME_SKILL_ENABLED = 'enabled';
                this.CLASSNAME_ERROR = 'error';
                this.mspMode = false; //MSP編集モードフラグ
                this.setupFunctions = [
                    //イベント登録
                    function () {
                        _this.com.on('VocationalInfoChanged', function (vocationId) {
                            _this.refreshVocationInfo(vocationId);
                            //refreshTotalRequiredExp();
                            //refreshTotalExpRemain();
                            _this.refreshTotalSkillPt();
                            _this.refreshUrlBar();
                        });
                        _this.com.on('SkillLineChanged', function (vocationId, skillLineId) {
                            _this.refreshCurrentSkillPt(vocationId, skillLineId);
                            _this.refreshSkillList(skillLineId);
                            _this.refreshVocationInfo(vocationId);
                            //refreshTotalExpRemain();
                            _this.refreshTotalSkillPt();
                            _this.refreshTotalPassive();
                            _this.refreshUrlBar();
                        });
                        _this.com.on('MSPChanged', function (vocationId, skillLineId) {
                            _this.refreshSkillList(skillLineId);
                            _this.refreshVocationInfo(vocationId);
                            _this.refreshTotalPassive();
                            _this.refreshUrlBar();
                        });
                        _this.com.on('WholeChanged', function () {
                            _this.refreshAll();
                        });
                        _this.com.on('CustomSkillChanged', function (skillLineId) {
                            _this.refreshCustomSkill(skillLineId);
                        });
                    },
                    //レベル選択セレクトボックス項目設定
                    function () {
                        _this.$lvConsole = $('#lv_console');
                        var $select = $('#lv-select');
                        for (var i = _this.DB.consts.level.min; i <= _this.DB.consts.level.max; i++) {
                            $select.append($("<option />").val(i).text(i + " (" + _this.DB.skillPtsGiven[i] + ")"));
                        }
                        $select.change(function (e) {
                            var vocationId = _this.getCurrentVocation(e.currentTarget);
                            _this.com.updateLevel(vocationId, $(e.currentTarget).val());
                        });
                    },
                    //レベル欄クリック時にUI表示
                    function () {
                        $('.ent_title h2').click(function (e) {
                            _this.hideConsoles();
                            var vocationId = _this.getCurrentVocation(e.currentTarget);
                            var consoleLeft = $(e.currentTarget).find('.lv_h2').position().left - 3;
                            _this.$lvConsole.appendTo($(e.currentTarget)).css({ left: consoleLeft });
                            $('#lv-select').val(_this.sim.getLevel(vocationId));
                            _this.$lvConsole.show();
                            e.stopPropagation();
                        });
                    },
                    //特訓ポイント選択セレクトボックス設定
                    function () {
                        _this.$trainingPtConsole = $('#training_pt_console');
                        var $select = $('#training_pt_select');
                        for (var i = 0; i <= _this.DB.consts.trainingSkillPts.max; i++) {
                            $select.append($('<option />').val(i).text(i.toString() +
                                ' (' + numToFormedStr(_this.DB.trainingPts[i].stamps) + ')'));
                        }
                        $select.change(function (e) {
                            var vocationId = _this.getCurrentVocation(e.currentTarget);
                            return _this.com.updateTrainingSkillPt(vocationId, parseInt($(e.currentTarget).val(), 10));
                        });
                    },
                    //特訓表示欄クリック時にUI表示
                    function () {
                        $('.ent_title .training_pt').click(function (e) {
                            _this.hideConsoles();
                            var vocationId = _this.getCurrentVocation(e.currentTarget);
                            var consoleLeft = $('#training-' + vocationId).position().left - 3;
                            _this.$trainingPtConsole.appendTo($(e.currentTarget)).css({ left: consoleLeft });
                            $('#training_pt_select').val(_this.sim.getTrainingSkillPt(vocationId));
                            _this.$trainingPtConsole.show();
                            e.stopPropagation();
                        });
                    },
                    //スピンボタン設定
                    function () {
                        _this.$ptConsole = $('#pt_console');
                        var $spinner = $('#pt_spinner');
                        $spinner.spinner({
                            min: _this.DB.consts.skillPts.min,
                            max: _this.DB.consts.skillPts.max,
                            spin: function (e, ui) {
                                var vocationId = _this.getCurrentVocation(e.currentTarget);
                                var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                                var succeeded = _this.mspMode ?
                                    _this.com.updateMSP(vocationId, skillLineId, ui.value) :
                                    _this.com.updateSkillPt(vocationId, skillLineId, ui.value);
                                if (succeeded) {
                                    e.stopPropagation();
                                }
                                else {
                                    return false;
                                }
                            },
                            change: function (e, ui) {
                                var vocationId = _this.getCurrentVocation(e.currentTarget);
                                var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                                var newValue = $(e.currentTarget).val();
                                var oldValue = _this.mspMode ?
                                    _this.sim.getMSP(vocationId, skillLineId) :
                                    _this.sim.getSkillPt(vocationId, skillLineId);
                                if (isNaN(newValue)) {
                                    $(e.currentTarget).val(oldValue);
                                    return false;
                                }
                                newValue = parseInt(newValue, 10);
                                if (newValue == oldValue)
                                    return false;
                                var succeeded = _this.mspMode ?
                                    _this.com.updateMSP(vocationId, skillLineId, newValue) :
                                    _this.com.updateSkillPt(vocationId, skillLineId, newValue);
                                if (!succeeded) {
                                    $(e.currentTarget).val(oldValue);
                                    return false;
                                }
                            },
                            stop: function (e, ui) {
                                var skillLineId = _this.getCurrentSkillLine(e.currentTarget || e.target);
                                _this.selectSkillLine(skillLineId);
                            }
                        });
                    },
                    //スピンコントロール共通
                    function () {
                        $('input.ui-spinner-input').click(function (e) {
                            //テキストボックスクリック時数値を選択状態に
                            $(e.currentTarget).select();
                        }).keypress(function (e) {
                            //テキストボックスでEnter押下時更新して選択状態に
                            if (e.which == 13) {
                                $('#url_text').focus();
                                $(e.currentTarget).focus().select();
                            }
                        });
                    },
                    //スキルライン名クリック時にUI表示
                    function () {
                        $('.skill_table caption').mouseenter(function (e) {
                            _this.hideConsoles();
                            var vocationId = _this.getCurrentVocation(e.currentTarget);
                            var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                            //位置決め
                            var $baseSpan = $(e.currentTarget).find('.skill_current');
                            var consoleLeft = $baseSpan.position().left + $baseSpan.width() - 50;
                            $('#pt_reset').css({ 'margin-left': $(e.currentTarget).find('.skill_total').width() + 10 });
                            _this.$ptConsole.appendTo($(e.currentTarget).find('.console_wrapper')).css({ left: consoleLeft });
                            $('#pt_spinner').val(_this.mspMode ? _this.sim.getMSP(vocationId, skillLineId) : _this.sim.getSkillPt(vocationId, skillLineId));
                            //selectSkillLine(skillLineId);
                            _this.$ptConsole.show();
                            e.stopPropagation();
                        }).mouseleave(function (e) {
                            if ($('#pt_spinner:focus').length === 0)
                                _this.hideConsoles();
                        });
                    },
                    //MSP込み最大値設定ボタン
                    function () {
                        var maxPtWithMsp = _this.DB.consts.skillPts.valid - _this.DB.consts.msp.max;
                        var maxPtWithMspUnique = _this.DB.consts.skillPts.validUnique - _this.DB.consts.msp.max;
                        $('#max-with-msp').button({
                            icons: { primary: 'ui-icon-circle-arrow-s' },
                            text: true
                        }).click(function (e) {
                            var vocationId = _this.getCurrentVocation(e.currentTarget);
                            var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                            _this.com.updateSkillPt(vocationId, skillLineId, _this.DB.skillLines[skillLineId].unique ? maxPtWithMspUnique : maxPtWithMsp);
                            e.stopPropagation();
                        });
                    },
                    //職固有スキルホバー時にUI表示
                    function () {
                        _this.$mspMaxConsole = $('#mspmax_console');
                        Object.keys(_this.DB.skillLines).forEach(function (skillLineId) {
                            var skillLine = _this.DB.skillLines[skillLineId];
                            if (!skillLine.unique)
                                return;
                            var lastSkill = skillLineId + '_' + (skillLine.skills.length - 1).toString();
                            $('.' + lastSkill).mouseenter(function (e) {
                                _this.hideConsoles();
                                $(e.currentTarget).find('.skill_name').append(_this.$mspMaxConsole);
                                _this.$mspMaxConsole.show();
                                e.stopPropagation();
                            }).mouseleave(function (e) {
                                _this.hideConsoles();
                            });
                        });
                    },
                    function () {
                        _this.customSkillSelector = new CustomSkillSelector(_this.sim, _this.com);
                        _this.customSkillSelector.setup();
                    },
                    //カスタムスキル編集ボタン
                    function () {
                        $('#show-customskill-dialog').button({
                            icons: { primary: 'ui-icon-pencil' },
                            text: true
                        }).click(function (e) {
                            var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                            _this.customSkillSelector.show(skillLineId);
                            e.stopPropagation();
                        });
                    },
                    //160以上スキルホバー時にUI表示
                    function () {
                        _this.$customSkillConsole = $('#customskill_console');
                        $('.skill_table tr[class$="_15"],.skill_table tr[class$="_16"],.skill_table tr[class$="_17"]').mouseenter(function (e) {
                            var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                            $(e.currentTarget).parent().children("." + skillLineId + "_15").find('.skill_name').append(_this.$customSkillConsole);
                            _this.$customSkillConsole.show();
                            e.stopPropagation();
                        }).mouseleave(function (e) {
                            _this.hideConsoles();
                        });
                    },
                    //範囲外クリック時・ESCキー押下時にUI非表示
                    function () {
                        _this.$ptConsole.click(function (e) { return e.stopPropagation(); });
                        _this.$lvConsole.click(function (e) { return e.stopPropagation(); });
                        _this.$trainingPtConsole.click(function (e) { return e.stopPropagation(); });
                        $('body').click(function (e) { return _this.hideConsoles(); }).keydown(function (e) {
                            if (e.which == 27)
                                _this.hideConsoles();
                        });
                    },
                    //リセットボタン設定
                    function () {
                        $('#pt_reset').button({
                            icons: { primary: 'ui-icon-refresh' },
                            text: false
                        }).click(function (e) {
                            var vocationId = _this.getCurrentVocation(e.currentTarget);
                            var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                            _this.selectSkillLine(skillLineId);
                            if (_this.mspMode)
                                _this.com.updateMSP(vocationId, skillLineId, 0);
                            else
                                _this.com.updateSkillPt(vocationId, skillLineId, 0);
                            $('#pt_spinner').val(0);
                        }).dblclick(function (e) {
                            var skillLineId;
                            //ダブルクリック時に各職業の該当スキルをすべて振り直し
                            if (_this.mspMode) {
                                if (!window.confirm('マスタースキルポイントをすべて振りなおします。'))
                                    return;
                                _this.com.clearMSP();
                            }
                            else {
                                skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                                var skillName = _this.DB.skillLines[skillLineId].name;
                                if (!window.confirm('スキル「' + skillName + '」をすべて振りなおします。'))
                                    return;
                                _this.com.clearPtsOfSameSkills(skillLineId);
                                $('.' + skillLineId + ' .skill_current').text('0');
                            }
                            $('#pt_spinner').val(0);
                        });
                    },
                    //スキルテーブル項目クリック時
                    function () {
                        $('.skill_table tr[class]').click(function (e) {
                            var vocationId = _this.getCurrentVocation(e.currentTarget);
                            var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                            var skillIndex = parseInt($(e.currentTarget).attr('class').replace(skillLineId + '_', ''), 10);
                            _this.selectSkillLine(skillLineId);
                            var requiredPt = _this.DB.skillLines[skillLineId].skills[skillIndex].pt;
                            var totalPtsOfOthers;
                            if (_this.mspMode) {
                                totalPtsOfOthers = _this.sim.totalOfSameSkills(skillLineId);
                                if (requiredPt < totalPtsOfOthers)
                                    return;
                                _this.com.updateMSP(vocationId, skillLineId, requiredPt - totalPtsOfOthers);
                            }
                            else {
                                totalPtsOfOthers = _this.sim.totalOfSameSkills(skillLineId) + _this.sim.getMSP(vocationId, skillLineId) - _this.sim.getSkillPt(vocationId, skillLineId);
                                if (requiredPt < totalPtsOfOthers)
                                    return;
                                _this.com.updateSkillPt(vocationId, skillLineId, requiredPt - totalPtsOfOthers);
                            }
                        });
                    },
                    //MSPモード切替ラジオボタン
                    function () {
                        $('#msp_selector input').change(function (e) {
                            _this.toggleMspMode($(e.currentTarget).val() == 'msp');
                        });
                        shortcut.add('Ctrl+M', function () {
                            var newValue = _this.mspMode ? 'normal' : 'msp';
                            $('#msp_selector input').prop('checked', false);
                            $("#msp_selector input[value='" + newValue + "']").prop('checked', true).change();
                        });
                    },
                    //URLテキストボックスクリック・フォーカス時
                    function () {
                        $('#url_text').focus(function (e) {
                            _this.refreshSaveUrl();
                        }).click(function (e) {
                            $(e.currentTarget).select();
                        });
                    },
                    //保存用URLツイートボタン設定
                    function () {
                        $('#tw-saveurl').button().click(function (e) {
                            _this.refreshSaveUrl();
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
                            var windowParam = $.map(windowParams, function (val, key) { return key + '=' + val; }).join(',');
                            window.open(e.currentTarget.href, null, windowParam);
                            return false;
                        });
                    },
                    //おりたたむ・ひろげるボタン設定
                    function () {
                        var HEIGHT_FOLDED = '48px';
                        var HEIGHT_UNFOLDED = $('.class_group:last').height() + 'px';
                        var CLASSNAME_FOLDED = 'folded';
                        $('.toggle_ent').button({
                            icons: { primary: 'ui-icon-arrowthickstop-1-n' },
                            text: false,
                            label: 'おりたたむ'
                        }).click(function (e) {
                            var $entry = $(e.currentTarget).parents('.class_group');
                            $entry.toggleClass(CLASSNAME_FOLDED);
                            if ($entry.hasClass(CLASSNAME_FOLDED)) {
                                $entry.animate({ height: HEIGHT_FOLDED });
                                $(e.currentTarget).button('option', {
                                    icons: { primary: 'ui-icon-arrowthickstop-1-s' },
                                    label: 'ひろげる'
                                });
                            }
                            else {
                                $entry.animate({ height: HEIGHT_UNFOLDED });
                                $(e.currentTarget).button('option', {
                                    icons: { primary: 'ui-icon-arrowthickstop-1-n' },
                                    label: 'おりたたむ'
                                });
                            }
                        });
                        //すべておりたたむ・すべてひろげる
                        $('#fold-all').click(function (e) {
                            $(".class_group:not([class*=\"" + CLASSNAME_FOLDED + "\"]) .toggle_ent").click();
                            $('body, html').animate({ scrollTop: 0 });
                        });
                        $('#unfold-all').click(function (e) {
                            $('.' + CLASSNAME_FOLDED + ' .toggle_ent').click();
                            $('body, html').animate({ scrollTop: 0 });
                        });
                        var bodyTop = $('#body_content').offset().top;
                        //特定職業のみひろげる
                        $('#foldbuttons-vocation a').click(function (e) {
                            var vocationId = $(e.currentTarget).attr('id').replace('fold-', '');
                            $('body, html').animate({ scrollTop: $('#' + vocationId).offset().top - bodyTop });
                            if ($('#' + vocationId).hasClass(CLASSNAME_FOLDED))
                                $("#" + vocationId + " .toggle_ent").click();
                        });
                    },
                    //レベル一括設定
                    function () {
                        //セレクトボックス初期化
                        var $select = $('#setalllevel>select');
                        for (var i = _this.DB.consts.level.min; i <= _this.DB.consts.level.max; i++) {
                            $select.append($("<option />").val(i).text(i.toString()));
                        }
                        $select.val(_this.DB.consts.level.max);
                        $('#setalllevel>button').button().click(function (e) {
                            _this.com.setAllLevel($select.val());
                        });
                    },
                    //特訓スキルポイント一括設定（最大値固定）
                    function () {
                        $('#setalltrainingsp>button').button({
                            icons: { primary: 'ui-icon-star' }
                        }).click(function (e) {
                            _this.com.setAllTrainingSkillPt(_this.DB.consts.trainingSkillPts.max);
                        });
                    },
                    //全スキルをリセット
                    function () {
                        $('#clearallskills>button').button({
                            icons: { primary: 'ui-icon-refresh' }
                        }).click(function (e) {
                            if (!window.confirm('全職業のすべてのスキルを振りなおします。\n（レベル・特訓のポイントは変わりません）'))
                                return;
                            _this.com.clearAllSkills();
                        });
                    },
                    //ナビゲーションボタン
                    function () {
                        $('a#hirobaimport').button({
                            icons: { primary: 'ui-icon-arrowreturnthick-1-s' }
                        });
                        $('a#simpleui').button({
                            icons: { primary: 'ui-icon-transfer-e-w' }
                        }).click(function (e) {
                            var a = e.currentTarget;
                            a.href = a.href.replace(/\?.+$/, '') + '?' +
                                Base64.btoa(RawDeflate.deflate(_this.sim.serialize()));
                        });
                    },
                    //スキル選択時に同スキルを強調
                    function () {
                        $('.skill_table').click(function (e) {
                            var skillLineId = $(e.currentTarget).attr('class').split(' ')[0];
                            $('.skill_table').removeClass('selected');
                            $('.' + skillLineId).addClass('selected');
                        });
                    },
                    //パッシブプリセット
                    function () {
                        //セレクトボックス初期化
                        var SELECT_TABLE = [
                            { val: 'pow', text: 'ちから' },
                            { val: 'def', text: 'みのまもり' },
                            { val: 'dex', text: 'きようさ' },
                            { val: 'spd', text: 'すばやさ' },
                            { val: 'magic', text: 'こうげき魔力' },
                            { val: 'heal', text: 'かいふく魔力' },
                            { val: 'charm', text: 'みりょく' },
                            { val: 'maxhp', text: 'さいだいHP' },
                            { val: 'maxmp', text: 'さいだいMP' },
                            { val: 'maxhp;maxmp', text: 'さいだいHP・MP' }
                        ];
                        var $select = $('#preset>select');
                        for (var i = 0; i < SELECT_TABLE.length; i++) {
                            $select.append($("<option />").val(SELECT_TABLE[i].val).text(SELECT_TABLE[i].text));
                        }
                        $select.val('maxhp;maxmp');
                        $('#preset>button').button().click(function (e) {
                            _this.com.presetStatus($select.val());
                        });
                    },
                    //全職業のレベルを取得スキルに応じて引き上げ
                    function () {
                        $('#bringUpLevel>button').button({
                            icons: { primary: 'ui-icon-arrowthickstop-1-n' }
                        }).click(function (e) {
                            if (!window.confirm('全職業のレベルを現在の取得スキルに必要なところまで引き上げます。'))
                                return;
                            _this.com.bringUpLevelToRequired();
                        });
                    },
                    //undo/redo
                    function () {
                        var $undoButton = $('#undo');
                        var $redoButton = $('#redo');
                        $undoButton.button({
                            icons: { primary: 'ui-icon-arrowreturnthick-1-w' },
                            disabled: true
                        }).click(function (e) {
                            _this.hideConsoles();
                            _this.com.undo();
                            _this.refreshAll();
                        });
                        $redoButton.button({
                            icons: { secondary: 'ui-icon-arrowreturnthick-1-e' },
                            disabled: true
                        }).click(function (e) {
                            _this.hideConsoles();
                            _this.com.redo();
                            _this.refreshAll();
                        });
                        _this.com.on('CommandStackChanged', function () {
                            $undoButton.button('option', 'disabled', !_this.com.isUndoable());
                            $redoButton.button('option', 'disabled', !_this.com.isRedoable());
                        });
                        shortcut.add('Ctrl+Z', function () { return $undoButton.click(); });
                        shortcut.add('Ctrl+Y', function () { return $redoButton.click(); });
                    }
                ];
                this.DB = SkillSimulator.SimulatorDB;
                this.sim = sim;
                this.com = new SkillSimulator.SimulatorCommandManager();
            }
            SimulatorUI.prototype.refreshAll = function () {
                var _this = this;
                this.hideConsoles();
                this.refreshAllVocationInfo();
                Object.keys(this.DB.skillLines).forEach(function (skillLineId) { return _this.refreshSkillList(skillLineId); });
                this.refreshTotalSkillPt();
                this.refreshTotalPassive();
                this.refreshControls();
                this.refreshSaveUrl();
                this.refreshUrlBar();
                Object.keys(this.DB.skillLines).forEach(function (skillLineId) { return _this.refreshCustomSkill(skillLineId); });
            };
            SimulatorUI.prototype.refreshVocationInfo = function (vocationId) {
                var currentLevel = this.sim.getLevel(vocationId);
                var requiredLevel = this.sim.requiredLevel(vocationId);
                //見出し中のレベル数値
                $("#" + vocationId + " .lv_h2").text(currentLevel);
                var $levelH2 = $("#" + vocationId + " h2");
                //必要経験値
                $("#" + vocationId + " .exp").text(numToFormedStr(this.sim.requiredExp(vocationId, currentLevel)));
                //スキルポイント 残り / 最大値
                var maxSkillPts = this.sim.maxSkillPts(vocationId);
                var additionalSkillPts = this.sim.getTrainingSkillPt(vocationId);
                var remainingSkillPts = maxSkillPts + additionalSkillPts - this.sim.totalSkillPts(vocationId);
                var $skillPtsText = $("#" + vocationId + " .skill_pt .pts");
                $skillPtsText.text(remainingSkillPts + ' / ' + maxSkillPts);
                $('#training-' + vocationId).text(additionalSkillPts);
                //Lv不足の処理
                var isLevelError = (isNaN(requiredLevel) || currentLevel < requiredLevel);
                $levelH2.toggleClass(this.CLASSNAME_ERROR, isLevelError);
                $skillPtsText.toggleClass(this.CLASSNAME_ERROR, isLevelError);
                $("#" + vocationId + " .expinfo .error").toggle(isLevelError);
                if (isLevelError) {
                    $("#" + vocationId + " .req_lv").text(numToFormedStr(requiredLevel));
                    $("#" + vocationId + " .exp_remain").text(numToFormedStr(this.sim.requiredExpRemain(vocationId)));
                }
                //MSP 残り / 最大値
                var maxMSP = this.DB.consts.msp.max;
                var remainingMSP = maxMSP - this.sim.totalMSP(vocationId);
                var $mspText = $("#" + vocationId + " .mspinfo .pts");
                $mspText.text(remainingMSP + ' / ' + maxMSP);
                var isMspError = (remainingMSP < 0);
                $mspText.toggleClass(this.CLASSNAME_ERROR, isMspError);
            };
            SimulatorUI.prototype.refreshAllVocationInfo = function () {
                var _this = this;
                Object.keys(this.DB.vocations).forEach(function (vocationId) { return _this.refreshVocationInfo(vocationId); });
            };
            SimulatorUI.prototype.refreshTotalRequiredExp = function () {
                $('#total_exp').text(numToFormedStr(this.sim.totalRequiredExp()));
            };
            SimulatorUI.prototype.refreshTotalExpRemain = function () {
                var totalExpRemain = this.sim.totalExpRemain();
                $('#total_exp_remain, #total_exp_remain_label').toggleClass(this.CLASSNAME_ERROR, totalExpRemain > 0);
                $('#total_exp_remain').text(numToFormedStr(totalExpRemain));
            };
            SimulatorUI.prototype.refreshTotalPassive = function () {
                var _this = this;
                var status = 'maxhp,maxmp,pow,def,dex,spd,magic,heal,charm'.split(',');
                status.forEach(function (s) { return $('#total_' + s).text(_this.sim.totalStatus(s)); });
            };
            SimulatorUI.prototype.refreshSkillList = function (skillLineId) {
                var _this = this;
                $("tr[class^=" + skillLineId + "_]").removeClass(this.CLASSNAME_SKILL_ENABLED); //クリア
                var totalOfSkill = this.sim.totalOfSameSkills(skillLineId);
                Object.keys(this.DB.vocations).filter(function (vocationId) {
                    return _this.DB.vocations[vocationId].skillLines.indexOf(skillLineId) >= 0;
                }).forEach(function (vocationId) {
                    var msp = _this.sim.getMSP(vocationId, skillLineId);
                    _this.DB.skillLines[skillLineId].skills.some(function (skill, i) {
                        if (totalOfSkill + msp < skill.pt)
                            return true;
                        $("#" + vocationId + " ." + skillLineId + "_" + i).addClass(_this.CLASSNAME_SKILL_ENABLED);
                        return false;
                    });
                    var isError = totalOfSkill + msp > (_this.DB.skillLines[skillLineId].unique ?
                        _this.DB.consts.skillPts.validUnique :
                        _this.DB.consts.skillPts.valid);
                    $("#" + vocationId + " ." + skillLineId + " .skill_total")
                        .text(totalOfSkill + msp)
                        .toggleClass(_this.CLASSNAME_ERROR, isError);
                    if (msp > 0)
                        $("<span>(" + msp + ")</span>")
                            .addClass('msp')
                            .appendTo("#" + vocationId + " ." + skillLineId + " .skill_total");
                });
            };
            SimulatorUI.prototype.refreshControls = function () {
                var _this = this;
                Object.keys(this.DB.vocations).forEach(function (vocationId) {
                    _this.DB.vocations[vocationId].skillLines.forEach(function (skillLineId) {
                        _this.refreshCurrentSkillPt(vocationId, skillLineId);
                    });
                });
            };
            SimulatorUI.prototype.refreshCurrentSkillPt = function (vocationId, skillLineId) {
                $("#" + vocationId + " ." + skillLineId + " .skill_current").text(this.sim.getSkillPt(vocationId, skillLineId));
            };
            SimulatorUI.prototype.refreshTotalSkillPt = function () {
                var $cont = $('#total_sp');
                var available = this.sim.wholeSkillPtsAvailable();
                var remain = available - this.sim.wholeSkillPtsUsed();
                $cont.text(remain + " / " + available);
                var isLevelError = (remain < 0);
                $cont.toggleClass(this.CLASSNAME_ERROR, isLevelError);
            };
            SimulatorUI.prototype.refreshSaveUrl = function () {
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
            };
            SimulatorUI.prototype.refreshUrlBar = function () {
                if (window.history && window.history.replaceState) {
                    var url = this.makeCurrentUrl();
                    history.replaceState(url, null, url);
                }
            };
            SimulatorUI.prototype.refreshCustomSkill = function (skillLineId) {
                var $skillLineTable = $("." + skillLineId);
                if ($skillLineTable.length === 0)
                    return;
                this.sim.getCustomSkills(skillLineId).forEach(function (customId, rank) {
                    var customSkill = new SimulatorCustomSkill(skillLineId, customId);
                    var $skill = $skillLineTable.find("tr." + skillLineId + "_" + (rank + 15));
                    $skill.find('.custom_skill_name').text(customSkill.getViewName(rank));
                    $skill.attr('title', customSkill.getHintText(rank));
                });
            };
            SimulatorUI.prototype.makeCurrentUrl = function () {
                return window.location.href.replace(window.location.search, "") + '?' +
                    Base64.btoa(RawDeflate.deflate(this.sim.serialize()));
            };
            SimulatorUI.prototype.selectSkillLine = function (skillLineId) {
                $('.skill_table').removeClass('selected');
                $('.' + skillLineId).addClass('selected');
            };
            SimulatorUI.prototype.toggleMspMode = function (mode) {
                this.mspMode = mode;
                $('body').toggleClass('msp', mode);
            };
            SimulatorUI.prototype.getCurrentVocation = function (currentNode) {
                return $(currentNode).parents('.class_group').attr('id');
            };
            SimulatorUI.prototype.getCurrentSkillLine = function (currentNode) {
                return $(currentNode).parents('.skill_table').attr('class').split(' ')[0];
            };
            SimulatorUI.prototype.hideConsoles = function () {
                this.$ptConsole.hide();
                this.$lvConsole.hide();
                this.$trainingPtConsole.hide();
                this.$mspMaxConsole.hide();
                this.$customSkillConsole.hide();
            };
            SimulatorUI.prototype.setup = function () {
                this.setupFunctions.forEach(function (func) { return func(); });
                this.refreshAll();
            };
            return SimulatorUI;
        }());
        var CustomSkillSelector = (function () {
            function CustomSkillSelector(sim, com) {
                this.sim = sim;
                this.com = com;
                this.DB = SkillSimulator.SimulatorDB;
            }
            CustomSkillSelector.prototype.setup = function () {
                var _this = this;
                this.$dialog = $('#customskill-selector');
                this.$maskScreen = $('#dark-screen');
                this.$maskScreen.click(function (e) {
                    _this.hide();
                });
                $('#customskill-selector-close-button').click(function (e) {
                    _this.hide();
                });
                //ヘッダー部ドラッグで画面移動可能
                this.$dialog.draggable({
                    handle: '#customskill-selector-header',
                    cursor: 'move'
                });
                this.$dialog.find('.customskill-entry-selector a').click(function (e) {
                    var $a = $(e.currentTarget);
                    var skillLineId = $a.data('skillline');
                    var customSkillId = $a.data('customskillId');
                    var rank = $a.data('rank');
                    _this.setCustomSkill(customSkillId, rank);
                });
                //スキルライン選択ボタン
                this.$dialog.find('#customskill-selector-skillline-buttons a').click(function (e) {
                    var skillLineId = $(e.currentTarget).data('skillline');
                    _this.showEntryList(skillLineId);
                    _this.loadCustomPalette();
                });
                //パレット削除ボタン
                this.$dialog.find('a.customskill-palette-delete').click(function (e) {
                    var rank = $(e.currentTarget).data('rank');
                    _this.clearPalette(rank);
                });
            };
            CustomSkillSelector.prototype.setCustomSkill = function (customSkillId, rank) {
                if (this.com.updateCustomSkill(this.currentSkillLineId, customSkillId, rank) == true)
                    this.loadCustomPalette();
            };
            CustomSkillSelector.prototype.showEntryList = function (skillLineId) {
                this.$dialog.find('.customskill-entrylist').hide();
                this.$dialog.find('#customskill-selector-entrylist-' + skillLineId).show();
                this.$dialog.find('#customskill-selector-skillline').text(this.DB.skillLines[skillLineId].name);
                this.currentSkillLineId = skillLineId;
            };
            CustomSkillSelector.prototype.loadCustomPalette = function () {
                var _this = this;
                var skillLineId = this.currentSkillLineId;
                var skills = this.sim.getCustomSkills(skillLineId);
                this.$dialog.find("#customskill-selector-entrylist-" + skillLineId + " .customskill-entry-selector a").toggleClass('selected', false);
                skills.forEach(function (customId, rank) {
                    _this.toggleEntrySelection(customId, rank, true);
                    var customSkill = new SimulatorCustomSkill(skillLineId, customId);
                    _this.fillPalette(rank, customSkill);
                });
            };
            CustomSkillSelector.prototype.clearPalette = function (rank) {
                var currentCustomSkillId = this.sim.getCustomSkills(this.currentSkillLineId)[rank];
                if (this.com.updateCustomSkill(this.currentSkillLineId, 0, rank) == true) {
                    this.fillPalette(rank, SimulatorCustomSkill.emptySkill());
                    this.toggleEntrySelection(currentCustomSkillId, rank, false);
                }
            };
            CustomSkillSelector.prototype.fillPalette = function (rank, customSkill) {
                var $palette = $('#customskill-selector-palette-' + rank.toString());
                $palette.text(customSkill.getViewName(rank));
                $palette.attr('title', customSkill.getHintText(rank));
            };
            CustomSkillSelector.prototype.toggleEntrySelection = function (customSkillId, rank, isSelected) {
                $("#customskill-selector-" + this.currentSkillLineId + "-" + customSkillId + "-" + rank + " a").toggleClass('selected', isSelected);
            };
            CustomSkillSelector.prototype.show = function (skillLineId) {
                if (skillLineId === void 0) { skillLineId = 'sword'; }
                this.showEntryList(skillLineId);
                this.loadCustomPalette();
                this.$maskScreen.show();
                this.$dialog.show();
            };
            CustomSkillSelector.prototype.hide = function () {
                this.$dialog.hide();
                this.$maskScreen.hide();
            };
            return CustomSkillSelector;
        }());
        var SimpleUI = (function () {
            function SimpleUI(sim) {
                var _this = this;
                this.CLASSNAME_SKILL_ENABLED = 'enabled';
                this.CLASSNAME_ERROR = 'error';
                this.setupFunctions = [
                    //URLテキストボックスクリック・フォーカス時
                    function () {
                        $('#url_text').focus(function (e) {
                            _this.refreshSaveUrl();
                        }).click(function (e) {
                            $(e.currentTarget).select();
                        });
                    },
                    //保存用URLツイートボタン設定
                    function () {
                        $('#tw-saveurl').button().click(function (e) {
                            _this.refreshSaveUrl();
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
                            var windowParam = $.map(windowParams, function (val, key) { return key + '=' + val; }).join(',');
                            window.open(e.currentTarget.href, null, windowParam);
                            return false;
                        });
                    },
                    //ナビゲーションボタン
                    function () {
                        $('a#mainui').button({
                            icons: { primary: 'ui-icon-transfer-e-w' }
                        }).click(function (e) {
                            var a = e.currentTarget;
                            a.href = a.href.replace(/\?.+$/, '') + '?' +
                                Base64.btoa(RawDeflate.deflate(_this.sim.serialize()));
                        });
                    }
                ];
                this.sim = sim;
                this.DB = SkillSimulator.SimulatorDB;
            }
            SimpleUI.prototype.refreshAll = function () {
                var _this = this;
                this.refreshAllVocationInfo();
                Object.keys(this.DB.skillLines).forEach(function (skillLineId) {
                    _this.refreshSkillList(skillLineId);
                });
                //refreshTotalRequiredExp();
                //refreshTotalExpRemain();
                // refreshTotalPassive();
                this.refreshControls();
                this.refreshSaveUrl();
            };
            SimpleUI.prototype.refreshVocationInfo = function (vocationId) {
                var currentLevel = this.sim.getLevel(vocationId);
                var requiredLevel = this.sim.requiredLevel(vocationId);
                //スキルポイント 残り / 最大値
                var maxSkillPts = this.sim.maxSkillPts(vocationId);
                var additionalSkillPts = this.sim.getTrainingSkillPt(vocationId);
                var remainingSkillPts = maxSkillPts + additionalSkillPts - this.sim.totalSkillPts(vocationId);
                $("#" + vocationId + " .remain .container").text(remainingSkillPts);
                $("#" + vocationId + " .total .container").text(maxSkillPts + additionalSkillPts);
                $("#" + vocationId + " .level").text("Lv " + currentLevel + " (" + maxSkillPts + ") + \u7279\u8A13 (" + additionalSkillPts + ")");
                //Lv不足の処理
                var isLevelError = (isNaN(requiredLevel) || currentLevel < requiredLevel);
                $("#" + vocationId + " .remain .container").toggleClass(this.CLASSNAME_ERROR, isLevelError);
            };
            SimpleUI.prototype.refreshAllVocationInfo = function () {
                var _this = this;
                Object.keys(this.DB.vocations).forEach(function (vocationId) {
                    _this.refreshVocationInfo(vocationId);
                });
                // $('#msp .remain .container').text(this.DB.consts.msp.max - this.sim.totalMSP());
                // $('#msp .total .container').text(this.DB.consts.msp.max);
            };
            SimpleUI.prototype.refreshTotalRequiredExp = function () {
                $('#total_exp').text(numToFormedStr(this.sim.totalRequiredExp()));
            };
            SimpleUI.prototype.refreshTotalExpRemain = function () {
                var totalExpRemain = this.sim.totalExpRemain();
                $('#total_exp_remain, #total_exp_remain_label').toggleClass(this.CLASSNAME_ERROR, totalExpRemain > 0);
                $('#total_exp_remain').text(numToFormedStr(totalExpRemain));
            };
            SimpleUI.prototype.refreshTotalPassive = function () {
                var _this = this;
                var status = 'maxhp,maxmp,pow,def,dex,spd,magic,heal,charm'.split(',');
                status.forEach(function (s) { return $('#total_' + s).text(_this.sim.totalStatus(s)); });
            };
            SimpleUI.prototype.refreshSkillList = function (skillLineId) {
                var _this = this;
                var totalOfSkill = this.sim.totalOfSameSkills(skillLineId);
                $("#footer ." + skillLineId + " .container").text(totalOfSkill);
                var containerName = '#msp .' + skillLineId;
                if (this.DB.skillLines[skillLineId].unique) {
                    Object.keys(this.DB.vocations).some(function (vocationId) {
                        if (_this.DB.vocations[vocationId].skillLines.indexOf(skillLineId) >= 0) {
                            containerName = '#' + vocationId + ' .msp';
                            return true;
                        }
                        return false;
                    });
                }
                // var msp = this.sim.getMSP(skillLineId);
                // $(containerName + ' .container').text(msp > 0 ? msp : '');
            };
            SimpleUI.prototype.refreshControls = function () {
                var _this = this;
                Object.keys(this.DB.vocations).forEach(function (vocationId) {
                    _this.DB.vocations[vocationId].skillLines.forEach(function (skillLineId) {
                        _this.refreshCurrentSkillPt(vocationId, skillLineId);
                    });
                });
            };
            SimpleUI.prototype.refreshCurrentSkillPt = function (vocationId, skillLineId) {
                var containerName = skillLineId;
                if (this.DB.skillLines[skillLineId].unique) {
                    //踊り子のパッシブ2種に対応
                    if (skillLineId == 'song') {
                        containerName = 'unique2';
                    }
                    else {
                        containerName = 'unique';
                    }
                }
                $("#" + vocationId + " ." + containerName + " .container")
                    .text(this.sim.getSkillPt(vocationId, skillLineId));
            };
            SimpleUI.prototype.refreshSaveUrl = function () {
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
            };
            SimpleUI.prototype.refreshUrlBar = function () {
                if (window.history && window.history.replaceState) {
                    var url = this.makeCurrentUrl();
                    window.history.replaceState(url, null, url);
                }
            };
            SimpleUI.prototype.makeCurrentUrl = function () {
                return window.location.href.replace(window.location.search, "") + '?' +
                    Base64.btoa(RawDeflate.deflate(this.sim.serialize()));
            };
            SimpleUI.prototype.getCurrentVocation = function (currentNode) {
                return $(currentNode).parents('.class_group').attr('id');
            };
            SimpleUI.prototype.getCurrentSkillLine = function (currentNode) {
                return $(currentNode).parents('.skill_table').attr('class').split(' ')[0];
            };
            SimpleUI.prototype.setup = function () {
                this.setupFunctions.forEach(function (func) { return func(); });
                this.refreshAll();
            };
            return SimpleUI;
        }());
        //ユーティリティ
        //数値を3桁区切りに整形
        function numToFormedStr(num) {
            if (isNaN(num))
                return 'N/A';
            return num.toString().split(/(?=(?:\d{3})+$)/).join(',');
        }
        (function ($) {
            SkillSimulator.Simulator = new SimulatorModel();
            //データJSONを格納する変数
            var DATA_JSON_URI = window.location.href.replace(/\/[^\/]*$/, '/dq10skill-data.json');
            var $dbLoad = $.getJSON(DATA_JSON_URI, function (data) {
                //SimulatorDB = data;
            });
            //ロード時
            $(function () {
                function loadQuery() {
                    var query = window.location.search.substring(1);
                    if (Base64.isValid(query)) {
                        var serial = '';
                        try {
                            serial = RawDeflate.inflate(Base64.atob(query));
                        }
                        catch (e) {
                        }
                        if (serial.length < 33) {
                            serial = Base64.atob(query);
                            SkillSimulator.Simulator.deserializeBit(serial);
                        }
                        else {
                            SkillSimulator.Simulator.deserialize(serial);
                        }
                    }
                }
                $dbLoad.done(function (data) {
                    SkillSimulator.SimulatorDB = data;
                    SkillSimulator.Simulator.initialize();
                    loadQuery();
                    var ui = window.location.pathname.indexOf('/simple.html') > 0 ? new SimpleUI(SkillSimulator.Simulator) : new SimulatorUI(SkillSimulator.Simulator);
                    ui.setup();
                });
            });
        })(jQuery);
    })(SkillSimulator = Dq10.SkillSimulator || (Dq10.SkillSimulator = {}));
})(Dq10 || (Dq10 = {}));
//# sourceMappingURL=dq10skill.js.map