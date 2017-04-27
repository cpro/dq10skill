/// <reference path="dq10skill-monster-main.ts" />
var Dq10;
(function (Dq10) {
    var SkillSimulator;
    (function (SkillSimulator) {
        var MonsterUnit = (function () {
            function MonsterUnit(monsterType, idnum) {
                var _this = this;
                this.skillLines = [];
                this.skillLineDic = {};
                this.badgeEquip = [];
                this.data = SkillSimulator.MonsterDB.monsters[monsterType];
                this.monsterType = monsterType;
                this.level = SkillSimulator.MonsterDB.consts.level.max;
                this.indivName = this.data.defaultName;
                this.restartCount = SkillSimulator.MonsterDB.consts.restart.max;
                this.id = monsterType + '_' + idnum.toString();
                this.data.skillLines.forEach(function (skillLineId) {
                    var skillLine = new MonsterSkillLine(skillLineId, 0);
                    _this.skillLines.push(skillLine);
                    _this.skillLineDic[skillLine.interfaceId] = skillLine;
                });
                //転生追加スキル
                for (var s = 0; s < SkillSimulator.ADDITIONAL_SKILL_MAX; s++) {
                    var skillLine = new MonsterSkillLine('', s + 1);
                    this.skillLines.push(skillLine);
                    this.skillLineDic[skillLine.interfaceId] = skillLine;
                }
                //バッジ
                for (var i = 0; i < SkillSimulator.BADGE_COUNT; i++)
                    this.badgeEquip.push(null);
                //なつき度
                this.natsuki = SkillSimulator.MonsterDB.natsukiPts.length - 1;
            }
            MonsterUnit.prototype.getSkillLine = function (interfaceId) {
                return this.skillLineDic[interfaceId];
            };
            //レベル値取得
            MonsterUnit.prototype.getLevel = function () {
                return this.level;
            };
            ;
            //レベル値更新
            MonsterUnit.prototype.updateLevel = function (newValue) {
                var oldValue = this.level;
                if (newValue < SkillSimulator.MonsterDB.consts.level.min ||
                    newValue > SkillSimulator.MonsterDB.consts.level.max) {
                    return oldValue;
                }
                this.level = newValue;
                return newValue;
            };
            ;
            //スキルポイント合計
            MonsterUnit.prototype.totalSkillPts = function () {
                var _this = this;
                return this.skillLines.reduce(function (prev, skillLine) {
                    if (skillLine.skillLineId === '' || _this.restartCount < skillLine.requiredRestarts)
                        return prev;
                    return prev + skillLine.skillPt;
                }, 0);
            };
            ;
            //現在のレベルに対するスキルポイント最大値
            MonsterUnit.prototype.maxSkillPts = function () {
                return SkillSimulator.MonsterDB.skillPtsGiven[this.level];
            };
            ;
            //スキルポイント合計に対する必要レベル取得
            MonsterUnit.prototype.requiredLevel = function () {
                var restartSkillPt = this.getRestartSkillPt();
                var natsukiSkillPts = this.getNatsukiSkillPts();
                var total = this.totalSkillPts() - restartSkillPt - natsukiSkillPts;
                for (var l = SkillSimulator.MonsterDB.consts.level.min; l <= SkillSimulator.MonsterDB.consts.level.max; l++) {
                    if (SkillSimulator.MonsterDB.skillPtsGiven[l] >= total)
                        return l;
                }
                return NaN;
            };
            ;
            //モンスター・レベルによる必要経験値
            MonsterUnit.prototype.requiredExp = function (level) {
                return Math.floor(SkillSimulator.MonsterDB.expRequired[this.data.expTable][level] *
                    (1 + this.restartCount * SkillSimulator.MonsterDB.consts.restart.expRatio));
            };
            ;
            //転生時の必要経験値 Lv50経験値×転生補正値の累計
            MonsterUnit.prototype.additionalExp = function () {
                var expMax = SkillSimulator.MonsterDB.expRequired[this.data.expTable][SkillSimulator.MonsterDB.consts.level.max];
                if (isNaN(expMax))
                    return 0;
                var additionalExp = 0;
                for (var r = 0; r < this.restartCount; r++) {
                    additionalExp += Math.floor(expMax * (1 + r * SkillSimulator.MonsterDB.consts.restart.expRatio));
                }
                return additionalExp;
            };
            ;
            //不足経験値
            MonsterUnit.prototype.requiredExpRemain = function () {
                var required = this.requiredLevel();
                if (required <= this.level)
                    return 0;
                var remain = this.requiredExp(required) - this.requiredExp(this.level);
                return remain;
            };
            ;
            //個体名の取得
            MonsterUnit.prototype.getIndividualName = function () {
                return this.indivName;
            };
            ;
            //個体名の更新
            MonsterUnit.prototype.updateIndividualName = function (newName) {
                this.indivName = newName;
            };
            ;
            //転生回数の取得
            MonsterUnit.prototype.getRestartCount = function () {
                return this.restartCount;
            };
            ;
            //転生回数の更新
            MonsterUnit.prototype.updateRestartCount = function (newValue) {
                if (newValue < SkillSimulator.MonsterDB.consts.restart.min || newValue > SkillSimulator.MonsterDB.consts.restart.max) {
                    return false;
                }
                this.restartCount = newValue;
                return true;
            };
            ;
            //転生による追加スキルポイントの取得
            MonsterUnit.prototype.getRestartSkillPt = function () {
                return SkillSimulator.MonsterDB.consts.restart.skillPts[this.restartCount];
            };
            ;
            //転生追加スキルの取得
            MonsterUnit.prototype.getAdditionalSkill = function (skillIndex) {
                return this.getSkillLine('additional' + skillIndex.toString()).skillLineId;
            };
            ;
            //転生追加スキルの更新
            MonsterUnit.prototype.updateAdditionalSkill = function (skillIndex, newValue) {
                if (skillIndex < 0 || skillIndex > SkillSimulator.ADDITIONAL_SKILL_MAX)
                    return false;
                var skillLine = this.getSkillLine('additional' + skillIndex.toString());
                if (newValue === null) {
                    newValue = '';
                }
                else {
                    if (this.skillLines.some(function (sl) {
                        if (sl == skillLine)
                            return false;
                        return sl.isAdditional && sl.skillLineId == newValue;
                    }))
                        return false;
                }
                skillLine.skillLineId = newValue;
                return true;
            };
            ;
            //なつき度達成状態の取得
            MonsterUnit.prototype.getNatsuki = function () {
                return this.natsuki;
            };
            ;
            //なつき度達成状態の更新
            MonsterUnit.prototype.updateNatsuki = function (natsuki) {
                this.natsuki = natsuki;
                return true;
            };
            ;
            //なつき度に対するSP取得
            MonsterUnit.prototype.getNatsukiSkillPts = function () {
                return SkillSimulator.MonsterDB.natsukiPts[this.getNatsuki()].pt;
            };
            ;
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
            MonsterUnit.prototype.getTotalStatus = function (status) {
                var total = this.getTotalPassive(status);
                //Lv50時ステータス
                if (status == 'atk') {
                    total += this.getTotalStatus('pow');
                }
                else if (status == 'stylish') {
                    total += this.getTotalStatus('charm');
                }
                else {
                    total += this.data.status[status];
                    //転生時のステータス増分
                    total += this.data.increment[status] * this.restartCount;
                }
                //バッジ
                for (var i = 0; i < this.badgeEquip.length; i++) {
                    if (this.badgeEquip[i] === null)
                        continue;
                    var badge = SkillSimulator.MonsterDB.badges[this.badgeEquip[i]];
                    if (badge[status])
                        total += badge[status];
                }
                return total;
            };
            ;
            //パッシブスキルのステータス加算合計値取得
            MonsterUnit.prototype.getTotalPassive = function (status) {
                return this.skillLines.reduce(function (wholeTotal, skillLine) {
                    if (skillLine.skillLineId == '')
                        return wholeTotal;
                    var skills;
                    skills = SkillSimulator.MonsterDB.skillLines[skillLine.skillLineId].skills;
                    var cur = skills.filter(function (skill) {
                        return skill.pt <= skillLine.skillPt;
                    }).reduce(function (skillLineTotal, skill) {
                        return skillLineTotal + (skill[status] || 0);
                    }, 0);
                    return wholeTotal + cur;
                }, 0);
            };
            ;
            Object.defineProperty(MonsterUnit.prototype, "isEnhanced", {
                get: function () {
                    return SkillSimulator.MonsterDB.consts.skillenhance.released.indexOf(this.monsterType) >= 0 &&
                        this.restartCount >= SkillSimulator.MonsterDB.consts.skillenhance.restart;
                },
                enumerable: true,
                configurable: true
            });
            return MonsterUnit;
        }());
        SkillSimulator.MonsterUnit = MonsterUnit;
        var MonsterSaveData;
        (function (MonsterSaveData) {
            //ビット数定義
            var BITS_MONSTER_TYPE = 6;
            var BITS_LEVEL = 8;
            var BITS_RESTART_COUNT = 4;
            var BITS_SKILL = 6;
            var BITS_ADDITIONAL_SKILL = 6;
            var BITS_BADGE = 10;
            var BITS_NATSUKI = 4;
            function bitDataLength() {
                return BITS_MONSTER_TYPE +
                    BITS_LEVEL +
                    BITS_RESTART_COUNT +
                    BITS_SKILL * (SkillSimulator.BASIC_SKILL_COUNT + SkillSimulator.ADDITIONAL_SKILL_MAX) +
                    BITS_ADDITIONAL_SKILL * SkillSimulator.ADDITIONAL_SKILL_MAX;
            }
            MonsterSaveData.bitDataLength = bitDataLength;
            MonsterSaveData.BITS_ENCODE = 6;
            /** 最初期の独自ビット圧縮していたバージョン */
            var VERSION_FIRST = 1;
            /** レジェンドバッジ実装でバッジ保存数が1つ増えたバージョン */
            var VERSION_LEGEND_BADGE = 4;
            /** 現在のSerializerのバージョン */
            var VERSION_CURRENT_SERIALIZER = 4;
            var Serializer = (function () {
                function Serializer() {
                }
                Serializer.prototype.exec = function (monsters) {
                    var _this = this;
                    var serial = '';
                    // バージョン番号
                    serial += String.fromCharCode(this.createVersionByteData());
                    serial = monsters.reduce(function (cur, monster) { return cur + _this.serialize(monster); }, serial);
                    return serial;
                };
                /** 現在のバージョン番号の最上位ビットにバージョン管理フラグとして1を立てる */
                Serializer.prototype.createVersionByteData = function () {
                    return (VERSION_CURRENT_SERIALIZER | 0x80);
                };
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
                Serializer.prototype.serialize = function (monster) {
                    var data = [];
                    data.push(monster.data.id);
                    data.push(monster.getLevel());
                    data.push(monster.getRestartCount());
                    // スキルライン
                    monster.skillLines.forEach(function (skillLine) {
                        data.push(skillLine.skillLineId == '' ? 0 : skillLine.skillPt);
                    });
                    // 転生追加スキルライン
                    for (var i = 0; i < SkillSimulator.ADDITIONAL_SKILL_MAX; i++) {
                        if (monster.getAdditionalSkill(i) === '') {
                            data.push(0);
                            continue;
                        }
                        SkillSimulator.MonsterDB.additionalSkillLines.some(function (additionalSkillLine) {
                            if (monster.getAdditionalSkill(i) == additionalSkillLine.name) {
                                data.push(additionalSkillLine.id);
                                return true;
                            }
                            return false;
                        });
                    }
                    // バッジ
                    for (i = 0; i < SkillSimulator.BADGE_COUNT; i++) {
                        var badgeIdNum = monster.badgeEquip[i] === null ? 0 : parseInt(monster.badgeEquip[i], 10);
                        data.push(badgeIdNum);
                    }
                    data.push(monster.getNatsuki());
                    var serial = data.map(function (d) { return String.fromCharCode(d); }).join('');
                    // 個体名
                    var indivName = monster.getIndividualName();
                    serial += String.fromCharCode(indivName.length) + indivName;
                    // 先頭にシリアル全体の長さを記録
                    serial = String.fromCharCode(serial.length) + serial;
                    return serial;
                };
                return Serializer;
            }());
            MonsterSaveData.Serializer = Serializer;
            var Deserializer = (function () {
                function Deserializer(wholeSerial) {
                    this.wholeSerial = wholeSerial;
                    this.version = VERSION_CURRENT_SERIALIZER;
                }
                Deserializer.prototype.exec = function (callback) {
                    var _this = this;
                    var cur = 0;
                    var getData = function () { return _this.wholeSerial.charCodeAt(cur++); };
                    this.version = this.judgeVersion();
                    if (this.version > VERSION_FIRST) {
                        cur++;
                        var idnum = 0;
                        while (cur < this.wholeSerial.length) {
                            var len = getData();
                            var serial = this.wholeSerial.substring(cur, cur + len);
                            var newMonster = this.deserialize(serial, idnum++);
                            callback(newMonster, idnum);
                            cur += len;
                        }
                    }
                    else {
                        // 初期バージョンの場合: セミコロン区切りでステータスと個体名が交互に入ってくる
                        var serials = this.wholeSerial.split(';');
                        var idnum = 0;
                        while (serials.length > 0) {
                            var newMonster = this.deserializeAsFirstVersion(serials.shift(), idnum++);
                            newMonster.updateIndividualName(UTF8.fromUTF8(Base64.atob(serials.shift())));
                            callback(newMonster, idnum);
                        }
                    }
                };
                Deserializer.prototype.deserialize = function (serial, idnum) {
                    var cur = 0;
                    var getData = function () { return serial.charCodeAt(cur++); };
                    var DB = SkillSimulator.MonsterDB;
                    var monster;
                    var monsterTypeId = getData();
                    Object.keys(DB.monsters).some(function (monsterType) {
                        if (monsterTypeId == DB.monsters[monsterType].id) {
                            monster = new MonsterUnit(monsterType, idnum);
                            return true;
                        }
                        return false;
                    });
                    if (monster === undefined)
                        return null;
                    monster.updateLevel(getData());
                    monster.updateRestartCount(getData());
                    //スキル
                    monster.skillLines.forEach(function (skillLine) {
                        skillLine.skillPt = getData();
                    });
                    //転生追加スキル種類
                    for (var i = 0; i < SkillSimulator.ADDITIONAL_SKILL_MAX; i++) {
                        var additionalSkillId = getData();
                        if (additionalSkillId === 0) {
                            monster.updateAdditionalSkill(i, null);
                            continue;
                        }
                        DB.additionalSkillLines.some(function (skillLine) {
                            if (additionalSkillId == skillLine.id) {
                                monster.updateAdditionalSkill(i, skillLine.name);
                                return true;
                            }
                            return false;
                        });
                    }
                    //バッジ
                    var badgeCount = SkillSimulator.BADGE_COUNT;
                    if (this.version < VERSION_LEGEND_BADGE)
                        badgeCount = 4;
                    for (i = 0; i < badgeCount; i++) {
                        var badgeIdStr;
                        var badgeId = getData();
                        if (badgeId === 0) {
                            badgeIdStr = null;
                        }
                        else {
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
                };
                Deserializer.prototype.judgeVersion = function () {
                    var firstByte = this.wholeSerial.charCodeAt(0);
                    // 先頭ビットが0の場合初期バージョンと判定（ID 1-28なので必ず0になる）
                    if ((firstByte & 0x80) === 0)
                        return VERSION_FIRST;
                    // 先頭ビットを除去したものをバージョン番号とする
                    return (firstByte & 0x7f);
                };
                Deserializer.prototype.deserializeAsFirstVersion = function (serial, idnum) {
                    var DB = SkillSimulator.MonsterDB;
                    var monster;
                    serial = Base64.atob(serial);
                    var bitArray = [];
                    for (var i = 0; i < serial.length; i++)
                        bitArray = bitArray.concat(numToBitArray(serial.charCodeAt(i), 8));
                    var monsterTypeId = bitArrayToNum(bitArray.splice(0, BITS_MONSTER_TYPE));
                    Object.keys(DB.monsters).some(function (monsterType) {
                        if (monsterTypeId == DB.monsters[monsterType].id) {
                            monster = new MonsterUnit(monsterType, idnum);
                            return true;
                        }
                        return false;
                    });
                    if (monster === undefined)
                        return null;
                    monster.updateLevel(bitArrayToNum(bitArray.splice(0, BITS_LEVEL)));
                    monster.updateRestartCount(bitArrayToNum(bitArray.splice(0, BITS_RESTART_COUNT)));
                    //スキル
                    monster.skillLines.forEach(function (skillLine) {
                        skillLine.skillPt = bitArrayToNum(bitArray.splice(0, BITS_SKILL));
                    });
                    //転生追加スキル種類
                    for (var i = 0; i < SkillSimulator.ADDITIONAL_SKILL_MAX; i++) {
                        var additionalSkillId = bitArrayToNum(bitArray.splice(0, BITS_ADDITIONAL_SKILL));
                        if (additionalSkillId === 0) {
                            monster.updateAdditionalSkill(i, null);
                            continue;
                        }
                        DB.additionalSkillLines.some(function (skillLine) {
                            if (additionalSkillId == skillLine.id) {
                                monster.updateAdditionalSkill(i, skillLine.name);
                                return true;
                            }
                            return false;
                        });
                    }
                    //バッジ
                    if (bitArray.length >= BITS_BADGE * SkillSimulator.BADGE_COUNT) {
                        var badgeIdStr;
                        for (i = 0; i < SkillSimulator.BADGE_COUNT; i++) {
                            var badgeId = bitArrayToNum(bitArray.splice(0, BITS_BADGE));
                            if (badgeId === 0) {
                                badgeIdStr = null;
                            }
                            else {
                                //0補間
                                badgeIdStr = '00' + badgeId.toString();
                                badgeIdStr = badgeIdStr.substring(badgeIdStr.length - 3);
                            }
                            monster.badgeEquip[i] = badgeIdStr;
                        }
                    }
                    //なつき度
                    if (bitArray.length >= BITS_NATSUKI) {
                        var natsuki = bitArrayToNum(bitArray.splice(0, BITS_NATSUKI));
                        monster.updateNatsuki(natsuki);
                    }
                    else {
                        monster.updateNatsuki(0);
                    }
                    return monster;
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
            MonsterSaveData.Deserializer = Deserializer;
        })(MonsterSaveData = SkillSimulator.MonsterSaveData || (SkillSimulator.MonsterSaveData = {}));
        var MonsterSkillLine = (function () {
            /**
             *
             */
            function MonsterSkillLine(id, requiredRestarts) {
                this._skillPt = 0;
                this._isAdditional = false;
                this.skillLineId = id;
                this._requiredRestarts = requiredRestarts;
                if (requiredRestarts == 0) {
                    this._interfaceId = id;
                }
                else {
                    this._interfaceId = 'additional' + (requiredRestarts - 1).toString();
                    this._isAdditional = true;
                }
            }
            Object.defineProperty(MonsterSkillLine.prototype, "name", {
                get: function () {
                    if (this.skillLineId === '')
                        return '';
                    return SkillSimulator.MonsterDB.skillLines[this.skillLineId].name;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(MonsterSkillLine.prototype, "enhancedName", {
                get: function () {
                    if (this.isAdditional || this.skillLineId === '')
                        return '';
                    return SkillSimulator.MonsterDB.skillLines[this.skillLineId].enhancedName || '';
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(MonsterSkillLine.prototype, "requiredRestarts", {
                get: function () {
                    return this._requiredRestarts;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(MonsterSkillLine.prototype, "skillPt", {
                get: function () {
                    return this._skillPt;
                },
                set: function (val) {
                    var max = (this.enhancedName == '' ? SkillSimulator.MonsterDB.consts.skillPts.max : SkillSimulator.MonsterDB.consts.skillPts.enhanced);
                    if (val < SkillSimulator.MonsterDB.consts.skillPts.min || val > max)
                        return;
                    this._skillPt = val;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(MonsterSkillLine.prototype, "interfaceId", {
                get: function () {
                    return this._interfaceId;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(MonsterSkillLine.prototype, "isAdditional", {
                get: function () {
                    return this._isAdditional;
                },
                enumerable: true,
                configurable: true
            });
            return MonsterSkillLine;
        }());
        SkillSimulator.MonsterSkillLine = MonsterSkillLine;
    })(SkillSimulator = Dq10.SkillSimulator || (Dq10.SkillSimulator = {}));
})(Dq10 || (Dq10 = {}));
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
/// <reference path="dq10skill-command.ts" />
/// <reference path="dq10skill-monster-main.ts" />
var Dq10;
(function (Dq10) {
    var SkillSimulator;
    (function (SkillSimulator) {
        var SingleValueCommand = (function () {
            function SingleValueCommand(monsterId, newValue) {
                this.prevValue = undefined;
                this.name = 'SingleValueCommand';
                this.monsterId = monsterId;
                this.newValue = newValue;
            }
            SingleValueCommand.prototype.isAbsorbable = function (command) {
                return this.name === command.name &&
                    (this.monsterId === undefined || this.monsterId === command.monsterId) &&
                    (this.skillLineId === undefined || this.skillLineId === command.skillLineId);
            };
            SingleValueCommand.prototype.absorb = function (newCommand) {
                this.newValue = newCommand.newValue;
            };
            return SingleValueCommand;
        }());
        //エントリ追加
        var AddMonster = (function () {
            function AddMonster(monsterType) {
                this.name = "AddMonster";
                this.monsterType = monsterType;
            }
            AddMonster.prototype.execute = function () {
                var newMonster = SkillSimulator.Simulator.addMonster(this.monsterType);
                if (newMonster) {
                    this.monsterId = newMonster.id;
                    this.newMonster = newMonster;
                }
                return !!newMonster;
            };
            AddMonster.prototype.undo = function () {
                SkillSimulator.Simulator.deleteMonster(this.monsterId);
            };
            AddMonster.prototype.isAbsorbable = function (command) { return false; };
            AddMonster.prototype.absorb = function () { };
            AddMonster.prototype.event = function () {
                return {
                    name: 'MonsterAppended',
                    args: [this.newMonster]
                };
            };
            AddMonster.prototype.undoEvent = function () {
                return {
                    name: 'MonsterRemoved',
                    args: [this.newMonster]
                };
            };
            return AddMonster;
        }());
        //エントリ削除
        var DeleteMonster = (function () {
            function DeleteMonster(monsterId) {
                this.name = "DeleteMonster";
                this.monsterId = monsterId;
            }
            DeleteMonster.prototype.execute = function () {
                this.deletedIndex = SkillSimulator.Simulator.indexOf(this.monsterId);
                var deleted = SkillSimulator.Simulator.deleteMonster(this.monsterId);
                if (deleted) {
                    this.deletedMonster = deleted;
                }
                return !!deleted;
            };
            DeleteMonster.prototype.undo = function () {
                SkillSimulator.Simulator.monsters.splice(this.deletedIndex, 0, this.deletedMonster);
            };
            DeleteMonster.prototype.isAbsorbable = function (command) { return false; };
            DeleteMonster.prototype.absorb = function () { };
            DeleteMonster.prototype.event = function () {
                return {
                    name: 'MonsterRemoved',
                    args: [this.deletedMonster]
                };
            };
            DeleteMonster.prototype.undoEvent = function () {
                return {
                    name: 'MonsterAppended',
                    args: [this.deletedMonster, this.deletedIndex]
                };
            };
            return DeleteMonster;
        }());
        var SimulatorCommandManager = (function (_super) {
            __extends(SimulatorCommandManager, _super);
            function SimulatorCommandManager() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            SimulatorCommandManager.prototype.addMonster = function (monsterType) {
                return this.invoke(new AddMonster(monsterType));
            };
            SimulatorCommandManager.prototype.deleteMonster = function (monsterId) {
                return this.invoke(new DeleteMonster(monsterId));
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
/// <reference path="typings/rawdeflate.d.ts" />
/// <reference path="typings/dq10skill.d.ts" />
/// <reference path="dq10skill-monster-monster.ts" />
/// <reference path="dq10skill-monster-command.ts" />
/// <reference path="base64.ts" />
var Dq10;
(function (Dq10) {
    var SkillSimulator;
    (function (SkillSimulator) {
        SkillSimulator.MONSTER_MAX = 8;
        SkillSimulator.BASIC_SKILL_COUNT = 3;
        SkillSimulator.ADDITIONAL_SKILL_MAX = 2;
        SkillSimulator.BADGE_COUNT = 5;
        var SimulatorModel = (function () {
            function SimulatorModel() {
                //パラメータ格納用
                this.monsters = [];
                //モンスターID管理
                this.lastId = 0;
            }
            /* メソッド */
            //モンスター追加
            SimulatorModel.prototype.addMonster = function (monsterType, index) {
                if (this.monsters.length >= SkillSimulator.MONSTER_MAX)
                    return null;
                var newMonster = new SkillSimulator.MonsterUnit(monsterType, this.lastId++);
                if (index === undefined)
                    this.monsters.push(newMonster);
                else
                    this.monsters.splice(index, 0, newMonster);
                return newMonster;
            };
            //IDからモンスター取得
            SimulatorModel.prototype.getMonster = function (monsterId) {
                return this.monsters[this.indexOf(monsterId)];
            };
            //指定IDのモンスター削除
            SimulatorModel.prototype.deleteMonster = function (monsterId) {
                var i = this.indexOf(monsterId);
                if (i !== null)
                    return this.monsters.splice(i, 1)[0];
                else
                    return false;
            };
            //指定IDのモンスターをひとつ下に並び替える
            SimulatorModel.prototype.movedownMonster = function (monsterId) {
                var i = this.indexOf(monsterId);
                if (i > this.monsters.length)
                    return;
                this.monsters.splice(i, 2, this.monsters[i + 1], this.monsters[i]);
            };
            //指定IDのモンスターをひとつ上に並び替える
            SimulatorModel.prototype.moveupMonster = function (monsterId) {
                var i = this.indexOf(monsterId);
                if (i < 0)
                    return;
                this.monsters.splice(i - 1, 2, this.monsters[i], this.monsters[i - 1]);
            };
            SimulatorModel.prototype.indexOf = function (monsterId) {
                for (var i = 0; i < this.monsters.length; i++) {
                    if (this.monsters[i].id == monsterId)
                        return i;
                }
                return null;
            };
            SimulatorModel.prototype.generateQueryString = function () {
                var serial = new SkillSimulator.MonsterSaveData.Serializer().exec(this.monsters);
                var utf8encoded = UTF8.toUTF8(serial);
                var zipped = RawDeflate.deflate(utf8encoded);
                return Base64.btoa(zipped);
            };
            SimulatorModel.prototype.applyQueryString = function (queryString) {
                var _this = this;
                var serial = '';
                if (queryString.indexOf(';') >= 0) {
                    serial = queryString;
                }
                else {
                    try {
                        var zipped = Base64.atob(queryString);
                        var utf8encoded = RawDeflate.inflate(zipped);
                        serial = UTF8.fromUTF8(utf8encoded);
                    }
                    catch (e) {
                    }
                }
                if (serial == '')
                    return;
                new SkillSimulator.MonsterSaveData.Deserializer(serial).exec(function (monster, idnum) {
                    _this.lastId = idnum;
                    _this.monsters.push(monster);
                });
            };
            SimulatorModel.prototype.validateQueryString = function (queryString) {
                if (!queryString.match(/^[A-Za-z0-9-_;]+$/))
                    return false;
                //Base64文字列をセミコロンで繋げていた旧形式の場合
                if (queryString.indexOf(';') >= 0) {
                    var query = queryString.split(';');
                    // データと個体名がペアで連続するので2の倍数である
                    if (query.length % 2 == 1)
                        return false;
                    return query.filter(function (q, i) { return (i % 2) === 0; }).every(function (q) {
                        return (q.length * SkillSimulator.MonsterSaveData.BITS_ENCODE >= SkillSimulator.MonsterSaveData.bitDataLength());
                    });
                }
                return true;
            };
            return SimulatorModel;
        }());
        SkillSimulator.SimulatorModel = SimulatorModel;
        /* UI */
        var SimulatorUI = (function () {
            function SimulatorUI(sim) {
                this.CLASSNAME_SKILL_ENABLED = 'enabled';
                this.CLASSNAME_ERROR = 'error';
                this.sim = SkillSimulator.Simulator;
                this.com = new SkillSimulator.SimulatorCommandManager();
                this.sim = sim;
                this.DB = SkillSimulator.MonsterDB;
            }
            //モンスターのエントリ追加
            SimulatorUI.prototype.drawMonsterEntry = function (monster) {
                var _this = this;
                var $ent = $('#monster_dummy').clone()
                    .attr('id', monster.id)
                    .css('display', 'block');
                $ent.find('.monstertype').text(monster.data.name);
                $ent.find('[id$=-dummy]').each(function (i, elem) {
                    var dummyId = $(elem).attr('id');
                    var newId = dummyId.replace('-dummy', '-' + monster.id);
                    $(elem).attr('id', newId);
                    $ent.find('label[for=' + dummyId + ']').attr('for', newId);
                });
                $ent.find('.indiv_name input').val(monster.indivName);
                var $skillContainer = $ent.find('.skill_tables');
                monster.skillLines.forEach(function (skillLine) {
                    var $table = _this.drawSkillTable(skillLine.interfaceId);
                    if (skillLine.isAdditional && monster.restartCount < skillLine.requiredRestarts)
                        $table.hide();
                    $skillContainer.append($table);
                });
                return $ent;
            };
            SimulatorUI.prototype.drawSkillTable = function (skillLineId) {
                var _this = this;
                var $table = $('<table />').addClass(skillLineId).addClass('skill_table');
                var dbSkillLine = this.DB.skillLines[skillLineId];
                $table.append('<caption><span class="skill_line_name">' +
                    dbSkillLine.name +
                    '</span>: <span class="skill_total">0</span></caption>')
                    .append('<tr><th class="console" colspan="2"><input class="ptspinner" /> <button class="reset">リセット</button></th></tr>');
                dbSkillLine.skills.forEach(function (skill, s) {
                    var enhanced = skill.pt > _this.DB.consts.skillPts.max;
                    var $skillRow = $('<tr />').addClass([skillLineId, s].join('_'))
                        .append('<td class="skill_pt">' + skill.pt + '</td>')
                        .append('<td class="skill_name">' + skill.name + '</td>');
                    if (skill.pt > _this.DB.consts.skillPts.max)
                        $skillRow.addClass('enhanced');
                    $table.append($skillRow);
                });
                return $table;
            };
            SimulatorUI.prototype.refreshEntry = function (monsterId) {
                var _this = this;
                this.refreshAdditionalSkillSelector(monsterId);
                this.refreshAdditionalSkill(monsterId);
                this.refreshSkillEnhance(monsterId);
                this.refreshMonsterInfo(monsterId);
                this.sim.getMonster(monsterId).skillLines.forEach(function (skillLine) {
                    _this.refreshSkillList(monsterId, skillLine.interfaceId);
                });
                this.refreshTotalStatus(monsterId);
                this.refreshControls(monsterId);
                this.refreshBadgeButtons(monsterId);
                this.refreshSaveUrl();
            };
            SimulatorUI.prototype.refreshAll = function () {
                var _this = this;
                this.sim.monsters.forEach(function (monster) { return _this.refreshEntry(monster.id); });
            };
            SimulatorUI.prototype.refreshMonsterInfo = function (monsterId) {
                var monster = this.sim.getMonster(monsterId);
                var currentLevel = monster.getLevel();
                var requiredLevel = monster.requiredLevel();
                //見出し中のレベル数値
                $("#" + monsterId + " .lv_h2").text(currentLevel);
                if (monster.getRestartCount() > 0)
                    $("#" + monsterId + " .lv_h2").append('<small> + ' + monster.getRestartCount() + '</small>');
                var $levelH2 = $("#" + monsterId + " h2");
                //必要経験値
                $("#" + monsterId + " .exp").text(numToFormedStr(monster.requiredExp(currentLevel)));
                var additionalExp = monster.additionalExp();
                if (additionalExp > 0)
                    $("#" + monsterId + " .exp").append('<small> + ' + numToFormedStr(additionalExp) + '</small>');
                //スキルポイント 残り / 最大値
                var maxSkillPts = monster.maxSkillPts();
                var restartSkillPts = monster.getRestartSkillPt();
                var natsukiSkillPts = monster.getNatsukiSkillPts();
                var remainingSkillPts = maxSkillPts + restartSkillPts + natsukiSkillPts - monster.totalSkillPts();
                var $skillPtsText = $("#" + monsterId + " .pts");
                $skillPtsText.text(remainingSkillPts + ' / ' + maxSkillPts);
                if (restartSkillPts > 0)
                    $skillPtsText.append('<small> +' + restartSkillPts + '</small>');
                if (natsukiSkillPts > 0)
                    $skillPtsText.append('<small> +' + natsukiSkillPts + '</small>');
                //Lv不足の処理
                var isLevelError = (isNaN(requiredLevel) || currentLevel < requiredLevel);
                $levelH2.toggleClass(this.CLASSNAME_ERROR, isLevelError);
                $skillPtsText.toggleClass(this.CLASSNAME_ERROR, isLevelError);
                $("#" + monsterId + " .error").toggle(isLevelError);
                if (isLevelError) {
                    $("#" + monsterId + " .req_lv").text(numToFormedStr(requiredLevel));
                    $("#" + monsterId + " .exp_remain").text(numToFormedStr(monster.requiredExpRemain()));
                }
            };
            SimulatorUI.prototype.refreshSkillList = function (monsterId, skillLineId) {
                var _this = this;
                $("#" + monsterId + " tr[class^=" + skillLineId + "_]").removeClass(this.CLASSNAME_SKILL_ENABLED); //クリア
                var monster = this.sim.getMonster(monsterId);
                var skillPt = monster.getSkillLine(skillLineId).skillPt;
                var skills = this.DB.skillLines[skillLineId].skills;
                this.DB.skillLines[skillLineId].skills.some(function (skill, s) {
                    if (skillPt < skill.pt)
                        return true;
                    $("#" + monsterId + " ." + skillLineId + "_" + s).addClass(_this.CLASSNAME_SKILL_ENABLED);
                    return false;
                });
                $("#" + monsterId + " ." + skillLineId + " .skill_total").text(skillPt);
            };
            SimulatorUI.prototype.refreshControls = function (monsterId) {
                var monster = this.sim.getMonster(monsterId);
                $("#" + monsterId + " .lv_select>select").val(monster.getLevel());
                $("#" + monsterId + " .restart_count").val(monster.getRestartCount());
                monster.skillLines.forEach(function (skillLine) {
                    $("#" + monsterId + " ." + skillLine.interfaceId + " .ptspinner").spinner('value', skillLine.skillPt);
                });
                $("#" + monsterId + " .natsuki-selector>select").val(monster.getNatsuki());
            };
            SimulatorUI.prototype.refreshSaveUrl = function () {
                var queryString = this.sim.generateQueryString();
                if (queryString.length === 0) {
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
            };
            SimulatorUI.prototype.refreshAdditionalSkillSelector = function (monsterId) {
                var _this = this;
                var monster = this.sim.getMonster(monsterId);
                for (var s = 0; s < SkillSimulator.ADDITIONAL_SKILL_MAX; s++) {
                    $("#" + monsterId + " .additional_skill_selector-" + s).toggle(monster.restartCount > s);
                }
                $("#" + monsterId + " .additional_skill_selector select").empty();
                if (monster.restartCount >= 1) {
                    this.DB.additionalSkillLines.forEach(function (additionalSkillData) {
                        var skillData = _this.DB.skillLines[additionalSkillData.name];
                        if (monster.restartCount >= additionalSkillData.restartCount &&
                            (!additionalSkillData.occupied ||
                                additionalSkillData.occupied.indexOf(monster.monsterType) >= 0)) {
                            $("#" + monsterId + " .additional_skill_selector select").append($('<option />').val(additionalSkillData.name).text(skillData.name));
                        }
                    });
                }
                for (s = 0; s < SkillSimulator.ADDITIONAL_SKILL_MAX; s++) {
                    $("#" + monsterId + " .additional_skill_selector-" + s + " select").val(monster.getAdditionalSkill(s));
                }
            };
            SimulatorUI.prototype.refreshAdditionalSkill = function (monsterId) {
                var _this = this;
                var monster = this.sim.getMonster(monsterId);
                var $table;
                monster.skillLines.filter(function (skillLine) { return skillLine.isAdditional; }).forEach(function (skillLine) {
                    $table = $("#" + monsterId + " ." + skillLine.interfaceId);
                    if (monster.restartCount >= skillLine.requiredRestarts && skillLine.skillLineId != '') {
                        _this.refreshAdditionalSkillTable($table, skillLine.skillLineId);
                        $table.show();
                    }
                    else {
                        $table.hide();
                    }
                });
            };
            SimulatorUI.prototype.refreshAdditionalSkillTable = function ($table, newSkillLine) {
                var _this = this;
                var data = this.DB.skillLines[newSkillLine];
                var tableClass = $table.attr('class').split(' ')[0];
                $table.find('caption .skill_line_name').text(data.name);
                data.skills.forEach(function (skill, i) {
                    var $tr = $table.find("tr." + tableClass + "_" + i);
                    var hintText = _this.getHintText(skill);
                    $tr.attr('title', hintText);
                    $tr.children('.skill_pt').text(skill.pt);
                    $tr.children('.skill_name').text(skill.name);
                });
            };
            SimulatorUI.prototype.refreshSkillEnhance = function (monsterId) {
                var _this = this;
                var monster = this.sim.getMonster(monsterId);
                monster.skillLines.forEach(function (skillLine) {
                    var isEnhanced = monster.isEnhanced && skillLine.enhancedName != '';
                    var $table = $("#" + monsterId + " ." + skillLine.interfaceId);
                    $table.find('caption .skill_line_name').text(isEnhanced ? skillLine.enhancedName : skillLine.name);
                    $table.find('.enhanced').toggle(isEnhanced);
                    $table.find('.ptspinner').spinner('option', 'max', isEnhanced ?
                        _this.DB.consts.skillPts.enhanced :
                        _this.DB.consts.skillPts.max);
                    if (!isEnhanced && skillLine.skillPt > _this.DB.consts.skillPts.max) {
                        skillLine.skillPt = _this.DB.consts.skillPts.max;
                        $table.find('.ptspinner').spinner('value', skillLine.skillPt);
                        _this.refreshSkillList(monsterId, skillLine.interfaceId);
                    }
                });
            };
            SimulatorUI.prototype.refreshTotalStatus = function (monsterId) {
                var monster = this.sim.getMonster(monsterId);
                var statusArray = 'maxhp,maxmp,atk,pow,def,magic,heal,spd,dex,charm,weight'.split(',');
                var $cont = $("#" + monsterId + " .status_info dl");
                statusArray.forEach(function (status) {
                    $cont.find('.' + status).text(monster.getTotalStatus(status));
                });
            };
            SimulatorUI.prototype.drawBadgeButton = function (monsterId, badgeIndex) {
                var monster = this.sim.getMonster(monsterId);
                var $badgeButton = $("#append-badge" + badgeIndex + "-" + monsterId);
                var $badgeButtonCont = $badgeButton.closest('li');
                var badgeId = monster.badgeEquip[badgeIndex];
                var badge = badgeId ? this.DB.badges[badgeId] : null;
                var buttonText = '';
                var buttonHintText = '';
                if (badge) {
                    buttonText = badgeId + ' ' + badge.name + '・' + this.DB.badgerarity[badge.rarity];
                    buttonHintText = this.badgeSelector.getFeatureCache(badgeId).join("\n");
                }
                else {
                    if (badgeIndex == monster.badgeEquip.length - 1)
                        buttonText = 'レジェンドバッジ';
                    else if (badgeIndex == monster.badgeEquip.length - 2)
                        buttonText = 'スペシャルバッジ';
                    else
                        buttonText = 'バッジ' + (badgeIndex + 1).toString();
                }
                $badgeButton.text(buttonText).attr('title', buttonHintText);
                var rarityClass = badge === null ? 'blank' : badge.rarity;
                $badgeButtonCont.toggleClass('blank', rarityClass == 'blank');
                Object.keys(this.DB.badgerarity).forEach(function (rarity) {
                    $badgeButtonCont.toggleClass(rarity, rarityClass == rarity);
                });
            };
            SimulatorUI.prototype.refreshBadgeButtons = function (monsterId) {
                for (var i = 0; i < SkillSimulator.BADGE_COUNT; i++)
                    this.drawBadgeButton(monsterId, i);
            };
            SimulatorUI.prototype.getCurrentMonsterId = function (currentNode) {
                return $(currentNode).parents('.monster_ent').attr('id');
            };
            SimulatorUI.prototype.getCurrentSkillLine = function (currentNode) {
                return $(currentNode).parents('.skill_table').attr('class').split(' ')[0];
            };
            SimulatorUI.prototype.getHintText = function (skill) {
                var hintText = skill.desc || '';
                if ((skill.mp !== null) && (skill.mp !== undefined))
                    hintText += "\n\uFF08\u6D88\u8CBBMP: " + skill.mp + "\uFF09";
                if ((skill.charge !== null) && (skill.charge !== undefined))
                    hintText += "\n\uFF08\u30C1\u30E3\u30FC\u30B8: " + skill.charge + "\u79D2\uFF09";
                if (skill.gold)
                    hintText += "\n\uFF08" + skill.gold + "G\uFF09";
                return hintText;
            };
            SimulatorUI.prototype.setupEntry = function (monsterId) {
                var _this = this;
                var $ent = $('#' + monsterId);
                //レベル選択セレクトボックス項目設定
                var $select = $ent.find('.lv_select>select');
                for (var i = this.DB.consts.level.min; i <= this.DB.consts.level.max; i++) {
                    $select.append($("<option />").val(i).text(i + " (" + this.DB.skillPtsGiven[i] + ")"));
                }
                //レベル選択セレクトボックス変更時
                $select.change(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    _this.sim.getMonster(monsterId).updateLevel($(e.currentTarget).val());
                    _this.refreshMonsterInfo(monsterId);
                    //refreshSaveUrl();
                });
                //レベル転生回数スピンボタン設定
                var $spinner = $ent.find('.restart_count');
                $spinner.spinner({
                    min: this.DB.consts.restart.min,
                    max: this.DB.consts.restart.max,
                    spin: function (e, ui) {
                        var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                        var monster = _this.sim.getMonster(monsterId);
                        if (monster.updateRestartCount(ui.value)) {
                            _this.refreshAdditionalSkillSelector(monsterId);
                            _this.refreshAdditionalSkill(monsterId);
                            _this.refreshSkillEnhance(monsterId);
                            _this.refreshMonsterInfo(monsterId);
                            _this.refreshTotalStatus(monsterId);
                        }
                        else {
                            return false;
                        }
                    },
                    change: function (e, ui) {
                        var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                        var monster = _this.sim.getMonster(monsterId);
                        if (isNaN($(e.currentTarget).val())) {
                            $(e.currentTarget).val(monster.getRestartCount());
                            return false;
                        }
                        if (monster.updateRestartCount(parseInt($(e.currentTarget).val(), 10))) {
                            _this.refreshAdditionalSkillSelector(monsterId);
                            _this.refreshAdditionalSkill(monsterId);
                            _this.refreshSkillEnhance(monsterId);
                            _this.refreshMonsterInfo(monsterId);
                            _this.refreshTotalStatus(monsterId);
                            _this.refreshSaveUrl();
                        }
                        else {
                            $(e.currentTarget).val(monster.getRestartCount());
                            return false;
                        }
                    },
                    stop: function (e, ui) {
                        _this.refreshSaveUrl();
                    }
                });
                //スピンボタン設定
                $spinner = $ent.find('.ptspinner');
                $spinner.spinner({
                    min: this.DB.consts.skillPts.min,
                    max: this.DB.consts.skillPts.max,
                    spin: function (e, ui) {
                        var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                        var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                        var skillLine = _this.sim.getMonster(monsterId).getSkillLine(skillLineId);
                        var oldVal = skillLine.skillPt;
                        skillLine.skillPt = ui.value;
                        if (skillLine.skillPt != oldVal) {
                            _this.refreshSkillList(monsterId, skillLineId);
                            _this.refreshMonsterInfo(monsterId);
                            _this.refreshTotalStatus(monsterId);
                            e.stopPropagation();
                        }
                        else {
                            return false;
                        }
                    },
                    change: function (e, ui) {
                        var target = e.currentTarget || e.target;
                        var monsterId = _this.getCurrentMonsterId(target);
                        var skillLineId = _this.getCurrentSkillLine(target);
                        var skillLine = _this.sim.getMonster(monsterId).getSkillLine(skillLineId);
                        if (isNaN($(target).val())) {
                            $(target).val(skillLine.skillPt);
                            return false;
                        }
                        var oldVal = skillLine.skillPt;
                        skillLine.skillPt = parseInt($(target).val(), 10);
                        if (skillLine.skillPt != oldVal) {
                            _this.refreshSkillList(monsterId, skillLineId);
                            _this.refreshMonsterInfo(monsterId);
                            _this.refreshTotalStatus(monsterId);
                            _this.refreshSaveUrl();
                        }
                        else {
                            $(target).val(skillLine.skillPt);
                            return false;
                        }
                    },
                    stop: function (e, ui) {
                        _this.refreshSaveUrl();
                    }
                });
                //テキストボックスクリック時数値を選択状態に
                $spinner.click(function (e) {
                    $(e.currentTarget).select();
                });
                //テキストボックスでEnter押下時更新して選択状態に
                $spinner.keypress(function (e) {
                    if (e.which == 13) {
                        $('#url_text').focus();
                        $(e.currentTarget).focus().select();
                    }
                });
                //リセットボタン設定
                $ent.find('.reset').button({
                    icons: { primary: 'ui-icon-refresh' },
                    text: false
                }).click(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                    var skillLine = _this.sim.getMonster(monsterId).getSkillLine(skillLineId);
                    skillLine.skillPt = 0;
                    $("#" + monsterId + " ." + skillLineId + " .ptspinner").spinner('value', skillLine.skillPt);
                    _this.refreshSkillList(monsterId, skillLineId);
                    _this.refreshMonsterInfo(monsterId);
                    _this.refreshTotalStatus(monsterId);
                    _this.refreshSaveUrl();
                });
                //スキルテーブル項目クリック時
                $ent.find('.skill_table tr[class]').click(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    var skillLineId = _this.getCurrentSkillLine(e.currentTarget);
                    var skillLine = _this.sim.getMonster(monsterId).getSkillLine(skillLineId);
                    var skillIndex = parseInt($(e.currentTarget).attr('class').replace(skillLineId + '_', ''), 10);
                    var requiredPt = _this.DB.skillLines[skillLineId].skills[skillIndex].pt;
                    skillLine.skillPt = requiredPt;
                    $("#" + monsterId + " ." + skillLineId + " .ptspinner").spinner('value', skillLine.skillPt);
                    _this.refreshSkillList(monsterId, skillLineId);
                    _this.refreshMonsterInfo(monsterId);
                    _this.refreshTotalStatus(monsterId);
                    _this.refreshSaveUrl();
                });
                //おりたたむ・ひろげるボタン設定
                var HEIGHT_FOLDED = '4.8em';
                var HEIGHT_UNFOLDED = $ent.height() + 'px';
                var CLASSNAME_FOLDED = 'folded';
                $ent.find('.toggle_ent').button({
                    icons: { primary: 'ui-icon-arrowthickstop-1-n' },
                    text: false,
                    label: 'おりたたむ'
                }).click(function (e) {
                    var $entry = $(e.currentTarget).parents('.monster_ent');
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
                //ヒントテキスト設定
                Object.keys(this.DB.skillLines).forEach(function (skillLineId) {
                    _this.DB.skillLines[skillLineId].skills.forEach(function (skill, i) {
                        var hintText = _this.getHintText(skill);
                        $("." + skillLineId + "_" + i).attr('title', hintText);
                    });
                });
                //削除ボタン
                $ent.find('.delete_entry').button({
                    icons: { primary: 'ui-icon-close' },
                    text: false
                }).click(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    var monster = _this.sim.getMonster(monsterId);
                    var additionalLevel = '';
                    if (monster.getRestartCount() > 0)
                        additionalLevel = "(+" + monster.getRestartCount() + ")";
                    var message = monster.data.name +
                        ' Lv' + monster.getLevel().toString() + additionalLevel +
                        ("\u300C" + monster.getIndividualName() + "\u300D\u3092\u524A\u9664\u3057\u307E\u3059\u3002") +
                        '\nよろしいですか？';
                    if (!window.confirm(message))
                        return;
                    _this.com.deleteMonster(monsterId);
                });
                //下へボタン
                $ent.find('.movedown').button({
                    icons: { primary: 'ui-icon-triangle-1-s' },
                    text: false
                }).click(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    var $ent = $('#' + monsterId);
                    if ($ent.next().length === 0)
                        return;
                    var zIndex = $ent.css('z-index');
                    var pos = $ent.position();
                    $ent.css({ position: 'absolute', top: pos.top, left: pos.left, 'z-index': 1 });
                    $ent.animate({ top: $ent.next().position().top + $ent.next().height() }, function () {
                        $ent.insertAfter($ent.next());
                        $ent.css({ position: 'relative', top: 0, left: 0, 'z-index': zIndex });
                        _this.sim.movedownMonster(monsterId);
                        _this.refreshSaveUrl();
                    });
                });
                //上へボタン
                $ent.find('.moveup').button({
                    icons: { primary: 'ui-icon-triangle-1-n' },
                    text: false
                }).click(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    var $ent = $('#' + monsterId);
                    if ($ent.prev().length === 0)
                        return;
                    var zIndex = $ent.css('z-index');
                    var pos = $ent.position();
                    $ent.css({ position: 'absolute', top: pos.top, left: pos.left, 'z-index': 1 });
                    $ent.animate({ top: $ent.prev().position().top }, function () {
                        $ent.insertBefore($ent.prev());
                        $ent.css({ position: 'relative', top: 0, left: 0, 'z-index': zIndex });
                        _this.sim.moveupMonster(monsterId);
                        _this.refreshSaveUrl();
                    });
                });
                //個体名テキストボックス
                $ent.find('.indiv_name input').change(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    var monster = _this.sim.getMonster(monsterId);
                    monster.updateIndividualName($(e.currentTarget).val());
                    _this.refreshSaveUrl();
                });
                //転生追加スキルセレクトボックス
                $ent.find('.additional_skill_selector select').change(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    var monster = _this.sim.getMonster(monsterId);
                    var selectorId = parseInt($(e.currentTarget).attr('id').match(/^select-additional(\d+)-/)[1]);
                    if (monster.updateAdditionalSkill(selectorId, $(e.currentTarget).val())) {
                        _this.refreshAdditionalSkill(monsterId);
                        _this.refreshMonsterInfo(monsterId);
                        _this.refreshTotalStatus(monsterId);
                        _this.refreshSaveUrl();
                    }
                    else {
                        $(e.currentTarget).val(monster.getAdditionalSkill(selectorId));
                        return false;
                    }
                });
                //バッジ選択ボタン
                $ent.find('.badge-button-container a').click(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    var badgeIndex = parseInt($(e.currentTarget).attr('id').match(/^append-badge(\d+)-/)[1], 10);
                    _this.badgeSelector.setCurrentMonster(_this.sim.getMonster(monsterId), badgeIndex);
                    _this.badgeSelector.show(function (badgeId) {
                        _this.sim.getMonster(monsterId).badgeEquip[badgeIndex] = badgeId;
                        _this.drawBadgeButton(monsterId, badgeIndex);
                        _this.refreshTotalStatus(monsterId);
                        _this.refreshSaveUrl();
                    });
                });
                //なつき度選択セレクトボックス
                var $natsukiSelect = $ent.find('.natsuki-selector>select');
                this.DB.natsukiPts.forEach(function (natukiData, i) {
                    $natsukiSelect.append($("<option />").val(i).text(natukiData.natsukido.toString() + '(' + natukiData.pt.toString() + ')'));
                });
                //なつき度選択セレクトボックス変更時
                $natsukiSelect.change(function (e) {
                    var monsterId = _this.getCurrentMonsterId(e.currentTarget);
                    var monster = _this.sim.getMonster(monsterId);
                    monster.updateNatsuki(parseInt($(e.currentTarget).val()));
                    _this.refreshMonsterInfo(monsterId);
                    _this.refreshSaveUrl();
                });
            };
            SimulatorUI.prototype.setupConsole = function () {
                var _this = this;
                //URLテキストボックスクリック時
                $('#url_text').click(function (e) {
                    $(e.currentTarget).select();
                });
                //保存用URLツイートボタン設定
                $('#tw-saveurl').button().click(function (e) {
                    if ($(e.currentTarget).attr('href') === '')
                        return false;
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
                //すべておりたたむ・すべてひろげるボタン
                var CLASSNAME_FOLDED = 'folded';
                $('#fold-all').click(function (e) {
                    $('.monster_ent:not([class*="' + CLASSNAME_FOLDED + '"]) .toggle_ent').click();
                    $('body, html').animate({ scrollTop: 0 });
                });
                $('#unfold-all').click(function (e) {
                    $('.' + CLASSNAME_FOLDED + ' .toggle_ent').click();
                    $('body, html').animate({ scrollTop: 0 });
                });
                //レベル一括設定
                //セレクトボックス初期化
                var $select = $('#setalllevel>select');
                for (var i = this.DB.consts.level.min; i <= this.DB.consts.level.max; i++) {
                    $select.append($("<option />").val(i).text(i.toString()));
                }
                $select.val(this.DB.consts.level.max);
                $('#setalllevel>button').button().click(function (e) {
                    _this.sim.monsters.forEach(function (monster) { return monster.updateLevel($select.val()); });
                    _this.refreshAll();
                });
                $('.appendbuttons a').click(function (e) {
                    var monsterType = $(e.currentTarget).attr('id').replace('append-', '');
                    _this.com.addMonster(monsterType);
                });
            };
            SimulatorUI.prototype.setupEvents = function () {
                var _this = this;
                this.com.on('MonsterAppended', function (monster, index) {
                    $('#initial-instruction').hide();
                    $('#monsters').append(_this.drawMonsterEntry(monster));
                    _this.setupEntry(monster.id);
                    _this.refreshEntry(monster.id);
                    $('#' + monster.id + ' .indiv_name input').focus().select();
                });
                this.com.on('MonsterRemoved', function (monster) {
                    $('#' + monster.id).remove();
                    _this.refreshSaveUrl();
                    if (_this.sim.monsters.length === 0)
                        $('#initial-instruction').show();
                });
            };
            SimulatorUI.prototype.setupAll = function () {
                var _this = this;
                this.setupConsole();
                this.setupEvents();
                this.badgeSelector = new BadgeSelector();
                this.badgeSelector.setup();
                $('#monsters').empty();
                if (this.sim.monsters.length > 0)
                    $('#initial-instruction').hide();
                this.sim.monsters.forEach(function (monster) { return $('#monsters').append(_this.drawMonsterEntry(monster)); });
                this.setupEntry('monsters');
                this.refreshAll();
            };
            return SimulatorUI;
        }());
        //バッジ選択ダイアログ
        var BadgeSelector = (function () {
            function BadgeSelector() {
                this.dialogResult = false;
                this.selectedBadgeId = null;
                //バッジ効果リストのキャッシュ
                this.featureCache = {};
                //ソート順の昇降を保持
                this.sortByIdDesc = false;
                this.sortByKanaDesc = false;
                //モンスターデータを一部保持
                this.status = {};
                this.currentBadgeId = null;
                this.badgeEquip = [];
                this.STATUS_ARRAY = 'atk,def,maxhp,maxmp,magic,heal,spd,dex,stylish,weight'.split(',');
                this.DB = SkillSimulator.MonsterDB;
                this.badgeSearch = new BadgeSearch();
            }
            BadgeSelector.prototype.setup = function () {
                var _this = this;
                this.$dialog = $('#badge-selector');
                this.$maskScreen = $('#dark-screen');
                this.$maskScreen.click(function (e) {
                    _this.cancel();
                });
                //ヘッダー部ドラッグで画面移動可能
                this.$dialog.draggable({
                    handle: '#badge-selector-header',
                    cursor: 'move'
                });
                //バッジをはずすボタン
                $('#badge-selector-remove').click(function (e) {
                    _this.apply(null);
                }).hover(function (e) {
                    _this.clearBadgeInfo();
                    _this.refreshStatusAfter(null);
                });
                //バッジ設定ボタン
                $('#badge-selector-list a').click(function (e) {
                    var badgeId = _this.getBadgeId(e.currentTarget);
                    _this.apply(badgeId);
                }).hover(function (e) {
                    var badgeId = _this.getBadgeId(e.currentTarget);
                    _this.refreshBadgeInfo(badgeId);
                    _this.refreshStatusAfter(badgeId);
                });
                //バッジ検索ボタン
                $('#badge-search-buttons-race,' +
                    '#badge-search-buttons-rarity,' +
                    '#badge-search-buttons-feature').find('a').click(function (e) {
                    var searchKey = $(e.currentTarget).attr('data-search-key');
                    var filterType = $(e.currentTarget).attr('data-filter-type');
                    var isTurningOn = _this.badgeSearch.toggleSearch(filterType, searchKey);
                    _this.toggleSearchButtons(e.currentTarget, isTurningOn, (filterType == 'race' || filterType == 'rarity'));
                    _this.filterButtons(_this.badgeSearch.getIds());
                    if (isTurningOn && filterType == 'feature' && _this.DB.badgefeature[searchKey]['type'] == 'int') {
                        _this.sortBadgeByFeatureValue(searchKey, true);
                    }
                });
                //バッジ機能検索
                $('#badge-search-word-gosearch').find('a').click(function (e) {
                    var searchKey = $('#badge-search-word-input').val();
                    if (searchKey === '')
                        return;
                    _this.badgeSearch.setWordSearch(searchKey);
                    _this.filterButtons(_this.badgeSearch.getIds());
                });
                $('#badge-search-word-input').keyup(function (e) {
                    if (e.keyCode == 13)
                        $('#badge-search-word-gosearch').find('a').click();
                });
                //バッジソートボタン
                $('#badge-sort-badgeid').click(function (e) {
                    _this.sortBadgeById(_this.sortByIdDesc);
                    _this.sortByIdDesc = !_this.sortByIdDesc;
                    _this.sortByKanaDesc = false;
                });
                $('#badge-sort-kana').click(function (e) {
                    _this.sortBadgeByKana(_this.sortByKanaDesc);
                    _this.sortByKanaDesc = !_this.sortByKanaDesc;
                    _this.sortByIdDesc = false;
                });
                //検索クリアボタン
                $('#badge-search-clear').click(function (e) {
                    _this.clearFilter();
                });
            };
            BadgeSelector.prototype.getBadgeId = function (elem) {
                if (elem.tagName.toUpperCase() == 'LI')
                    elem = $(elem).find('a').get(0);
                if ($(elem).attr('id') == 'badge-selector-remove')
                    return null;
                else
                    return $(elem).attr('data-badge-id');
            };
            BadgeSelector.prototype.clearBadgeInfo = function () {
                $('#badge-selector-badge-id').text('');
                $('#badge-selector-badge-name').text('');
                $('#badge-selector-race').text('');
                $('#badge-selector-feature-list').empty();
            };
            BadgeSelector.prototype.refreshBadgeInfo = function (badgeId) {
                var badge = this.DB.badges[badgeId];
                if (!badge)
                    return;
                $('#badge-selector-badge-id').text(badgeId);
                var badgeName = badge.name + '・' + this.DB.badgerarity[badge.rarity];
                $('#badge-selector-badge-name').text(badgeName);
                var raceName;
                if (badge.race == 'special')
                    raceName = 'スペシャルバッジ';
                else
                    raceName = this.DB.badgerace[badge.race].name + '系';
                $('#badge-selector-race').text(raceName);
                var features = this.getFeatureCache(badgeId);
                var $featureList = $('#badge-selector-feature-list');
                $featureList.empty();
                features.forEach(function (feature) { return $('<li>').text(feature).appendTo($featureList); });
            };
            BadgeSelector.prototype.getFeatureCache = function (badgeId) {
                if (this.featureCache[badgeId])
                    return this.featureCache[badgeId];
                var badge = this.DB.badges[badgeId];
                this.featureCache[badgeId] = (new BadgeFeature(badge)).getFeatures();
                return this.featureCache[badgeId];
            };
            BadgeSelector.prototype.setCurrentMonster = function (monster, badgeIndex) {
                var _this = this;
                this.STATUS_ARRAY.forEach(function (s) {
                    _this.status[s] = monster.getTotalStatus(s);
                    $('#badge-status-current-' + s).text(_this.status[s]);
                });
                this.currentBadgeId = monster.badgeEquip[badgeIndex];
                this.refreshStatusAfter(null);
            };
            BadgeSelector.prototype.refreshStatusAfter = function (badgeId) {
                var _this = this;
                var currentBadge = null;
                if (this.currentBadgeId !== null)
                    currentBadge = this.DB.badges[this.currentBadgeId];
                var newBadge = null;
                if (badgeId !== null)
                    newBadge = this.DB.badges[badgeId];
                this.STATUS_ARRAY.forEach(function (s) {
                    var before = _this.status[s];
                    var after = before;
                    if (currentBadge !== null && currentBadge[s])
                        after -= currentBadge[s];
                    if (newBadge !== null && newBadge[s])
                        after += newBadge[s];
                    $('#badge-status-after-' + s).text(before == after ? '' : after)
                        .toggleClass('badge-status-plus', before < after)
                        .toggleClass('badge-status-minus', before > after);
                });
            };
            BadgeSelector.prototype.toggleSearchButtons = function (anchor, isTurningOn, isUnique) {
                var $button = $(anchor).parent('li');
                var $container = $button.parent('ul');
                if (isUnique)
                    $container.find('li').removeClass('selected');
                $button.toggleClass('selected', isTurningOn);
            };
            BadgeSelector.prototype.filterButtons = function (showIds) {
                var _this = this;
                var $allVisibleButtons = $('#badge-selector-list li:visible');
                var $allHiddenButtons = $('#badge-selector-list li:hidden');
                $allVisibleButtons.filter(function (i, elem) {
                    var badgeId = _this.getBadgeId(elem);
                    return showIds.indexOf(badgeId) == -1;
                }).hide();
                $allHiddenButtons.filter(function (i, elem) {
                    var badgeId = _this.getBadgeId(elem);
                    return showIds.indexOf(badgeId) != -1;
                }).show();
            };
            BadgeSelector.prototype.sortBadgeBy = function (func, desc) {
                var _this = this;
                if (desc === undefined)
                    desc = false;
                $('#badge-selector-list').append($('#badge-selector-list li').toArray().sort(function (a, b) {
                    var key_a = func(a);
                    var key_b = func(b);
                    var ascend = key_a < key_b;
                    if (desc)
                        ascend = !ascend;
                    if (key_a == key_b) {
                        key_a = _this.getBadgeId(a);
                        key_b = _this.getBadgeId(b);
                        ascend = key_a < key_b;
                    }
                    return ascend ? -1 : 1;
                }));
            };
            BadgeSelector.prototype.sortBadgeById = function (desc) {
                var _this = this;
                this.sortBadgeBy(function (li) { return _this.getBadgeId(li); }, desc);
            };
            BadgeSelector.prototype.sortBadgeByKana = function (desc) {
                this.sortBadgeBy(function (li) { return $(li).attr('data-kana-sort-key'); }, desc);
            };
            BadgeSelector.prototype.sortBadgeByFeatureValue = function (feature, desc) {
                var _this = this;
                this.sortBadgeBy(function (li) {
                    var badgeId = _this.getBadgeId(li);
                    var ret = _this.DB.badges[badgeId][feature];
                    return ret !== undefined ? ret : 0;
                }, desc);
            };
            BadgeSelector.prototype.clearFilter = function () {
                $('#badge-selector-list li').show();
                this.badgeSearch.clear();
                $('#badge-search-buttons-race li,' +
                    '#badge-search-buttons-rarity li,' +
                    '#badge-search-buttons-feature li').removeClass('selected');
                $('#badge-search-word-input').val('');
                this.sortByIdDesc = false;
                $('#badge-sort-badgeid').click();
            };
            BadgeSelector.prototype.apply = function (badgeId) {
                this.closingCallback(badgeId);
                this.hide();
            };
            BadgeSelector.prototype.cancel = function () {
                this.hide();
            };
            BadgeSelector.prototype.show = function (callback) {
                this.clearBadgeInfo();
                this.$maskScreen.show();
                this.$dialog.show();
                this.selectedBadgeId = null;
                this.closingCallback = callback;
            };
            BadgeSelector.prototype.hide = function () {
                this.$dialog.hide();
                this.$maskScreen.hide();
            };
            return BadgeSelector;
        }());
        var BadgeFeature = (function () {
            function BadgeFeature(badge) {
                this.badge = badge;
                this.DB = SkillSimulator.MonsterDB;
            }
            BadgeFeature.prototype.getFeatures = function () {
                var _this = this;
                var features = [];
                Object.keys(this.DB.badgefeature).forEach(function (f) {
                    var feature = _this.DB.badgefeature[f];
                    var val = _this.badge[f];
                    if (!val)
                        return;
                    switch (feature.type) {
                        case 'int':
                        case 'string':
                            if (feature.format)
                                features.push(feature.format.replace('@v', val));
                            else
                                features.push(feature.name + ' +' + val.toString());
                            break;
                        case 'array':
                            features = features.concat(_this.getFeatureArrayFromArray(feature.format, val));
                            break;
                        case 'hash':
                            features = features.concat(_this.getFeatureArrayFromHash(feature.format, val));
                            break;
                    }
                });
                return features;
            };
            BadgeFeature.prototype.getFeatureArrayFromArray = function (format, fromArray) {
                return fromArray.map(function (ent) { return format.replace('@v', ent); });
            };
            BadgeFeature.prototype.getFeatureArrayFromHash = function (format, fromHash) {
                return Object.keys(fromHash).map(function (key) {
                    var value = fromHash[key];
                    return format.replace('@k', key).replace('@v', value);
                });
            };
            return BadgeFeature;
        }());
        ;
        //検索機能
        var BadgeSearch = (function () {
            function BadgeSearch() {
                this.univIds = []; //全集合
                this.search = [];
                //検索キャッシュ
                this.searchCache = {};
                this.DB = SkillSimulator.MonsterDB;
            }
            BadgeSearch.prototype.toggleSearch = function (filterType, searchKey) {
                var _this = this;
                var isTurningOn = true;
                this.search.some(function (filter, i) {
                    if (filter.filterType == filterType && filter.searchKey == searchKey) {
                        isTurningOn = false;
                        _this.search.splice(i, 1);
                        return true;
                    }
                    if ((filterType == 'race' || filterType == 'rarity') && filter.filterType == filterType) {
                        _this.search.splice(i, 1);
                        return true;
                    }
                });
                if (isTurningOn)
                    this.search.push({
                        filterType: filterType,
                        searchKey: searchKey
                    });
                return isTurningOn;
            };
            BadgeSearch.prototype.setWordSearch = function (searchKey) {
                var _this = this;
                var filterType = 'word';
                this.search.some(function (filter, i) {
                    if (filter.filterType == filterType) {
                        _this.search.splice(i, 1);
                        return true;
                    }
                });
                if (searchKey !== '')
                    this.search.push({
                        filterType: filterType,
                        searchKey: searchKey
                    });
            };
            BadgeSearch.prototype.getIds = function () {
                var _this = this;
                return this.search.reduce(function (ids, filter) {
                    var cacheKey = filter.filterType + '_' + filter.searchKey;
                    return _this.arrayIntersect(ids, _this.getSearchCache(cacheKey));
                }, this.getUnivIds());
            };
            BadgeSearch.prototype.arrayIntersect = function (array1, array2) {
                return array1.filter(function (val) { return array2.indexOf(val) >= 0; });
            };
            BadgeSearch.prototype.getSearchCache = function (key) {
                var _this = this;
                if (this.searchCache[key])
                    return this.searchCache[key];
                var _s = key.split('_'), filterType = _s[0], searchKey = _s[1];
                var filterFunc;
                switch (filterType) {
                    case 'race':
                        filterFunc = function (badge) { return badge.race == searchKey; };
                        break;
                    case 'rarity':
                        filterFunc = function (badge) { return badge.rarity == searchKey; };
                        break;
                    case 'feature':
                        filterFunc = function (badge) { return badge[searchKey] !== undefined; };
                        break;
                    case 'word':
                        filterFunc = function (badge) {
                            var features = (new BadgeFeature(badge)).getFeatures();
                            return features.some(function (f) { return f.indexOf(searchKey) >= 0; });
                        };
                        break;
                    default:
                        throw 'UnknownFilterType';
                }
                return this.getUnivIds().filter(function (id) { return filterFunc(_this.DB.badges[id]); });
            };
            BadgeSearch.prototype.getUnivIds = function () {
                if (this.univIds.length > 0)
                    return this.univIds;
                this.univIds = Object.keys(this.DB.badges);
                return this.univIds;
            };
            BadgeSearch.prototype.clear = function () {
                this.search = [];
            };
            return BadgeSearch;
        }());
        //数値を3桁区切りに整形
        function numToFormedStr(num) {
            if (isNaN(num))
                return 'N/A';
            return num.toString().split(/(?=(?:\d{3})+$)/).join(',');
        }
        (function ($) {
            SkillSimulator.Simulator = new SimulatorModel();
            //データJSONを格納する変数
            var DATA_JSON_URI = window.location.href.replace(/\/[^\/]*$/, '/dq10skill-monster-data.json');
            var $dbLoad = $.getJSON(DATA_JSON_URI, function (data) {
                SkillSimulator.MonsterDB = data;
            });
            //ロード時
            $(function () {
                $dbLoad.done(function (data) {
                    var query = window.location.search.substring(1);
                    if (SkillSimulator.Simulator.validateQueryString(query)) {
                        SkillSimulator.Simulator.applyQueryString(query);
                    }
                    var ui = new SimulatorUI(SkillSimulator.Simulator);
                    ui.setupAll();
                });
            });
        })(jQuery);
    })(SkillSimulator = Dq10.SkillSimulator || (Dq10.SkillSimulator = {}));
})(Dq10 || (Dq10 = {}));
//# sourceMappingURL=dq10skill-monster.js.map