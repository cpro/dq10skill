interface SkillSimulatorDB {
	skillLines: { [skillLineName: string]: SkillLine };
	skillLineOrder: string[];
	vocations: {
		[vocationName: string]: Vocation;
	};
	vocationOrder: string[];
	uniqueSkillLineOrder: string[];
	skillPtsGiven: {
		[index: number]: number[];
	};
	trainingPts: {
		stamps: number;
		pt: number;
	}[];
	consts: {
		skillPts: {
			min: number,
			max: number,
			valid: number,
			validUnique: number
		};
		level: {
			min: number;
			max: number;
			forTrainingMode: number;
		};
		trainingSkillPts: MinMax;
		msp: {
			min: number;
			max: number;
			/** 現在ゲーム中で取得可能なMSPの最大数 */
			possible: number;
		};
		customSkill: {
			pts: number[];
			count: number;
		}
	};
}
interface MinMax {
	min: number;
	max: number;
}

interface Vocation {
	name: string;
	abbr?: string;
	skillLines: string[];
	skillLineOrder?: string[];
	skillPtsTable: number;
	initialLevel?: number;
	disableTraining?: boolean;
}

interface SkillLine {
	id: number;
	unique?: boolean;
	name: string;
	enhancedName?: string;
	abbr?: string;
	skills: Skill[];
	customSkills?: CustomSkill[];
}

interface Skill {
	pt: number;
	name?: string;
	desc?: string;
	mp?: number;
	pow?: number;
	atk?: number;
	def?: number;
	dex?: number;
	spd?: number;
	magic?: number;
	heal?: number;
	maxhp?: number;
	maxmp?: number;
	charm?: number;
	gold?: number;
	charge?: number;
}

interface CustomSkill {
	id: number;
	name: string;
	viewName: string;
	selectorName: string;
	desc: string;
	val: number[];
	mp?: number;
	charge?: number;
	atk?: number;
}

interface MonsterSimulatorDB {
	skillLines: {
		[skillLine: string]: SkillLine;
	};
	monsters: {
		[monsterName: string]: Monster;
	};
	monstermaster: string[];
	itemmaster: string[];
	additionalSkillLines: {
		name: string;
		restartCount: number;
		id: number;
		occupied: string[];
	}[];
	skillPtsGiven: number[];
	expRequired: {
		[index: number]: number[];
	};
	consts: {
		skillPts: {
			min: number;
			max: number;
			enhanced: number;
		};
		level: MinMax;
		restart: {
			min: number;
			max: number;
			skillPts: number[];
			skillPtsOver5: number;
			expRatio: number;
		};
		skillenhance: {
			restart: number;
			released: string[];
		};
	};
	natsukiPts: {
		natsukido: number;
		pt: number;
	}[];
	badges: {
		[badgeId: string]: Badge;
	};
	badgerace: {
		[raceName: string]: {
			name: string;
			abbr: string;
		};
	};
	badgerarity: { [rarityName: string]: string };
	badgefeature: { [featureName: string]: BadgeFeature; };
}

interface Monster {
	id: number;
	name: string;
	defaultName: string;
	skillLines: string[];
	status: StatusSet;
	increment: StatusSet;
	expTable: number;
}

interface StatusSet {
	maxhp: number;
	maxmp: number;
	pow: number;
	def: number;
	magic: number;
	heal: number;
	spd: number;
	dex: number;
	charm: number;
	weight: number;
}

interface Badge {
	name: string;
	sort: string;
	rarity: string;
	race: string;
	// maxhp?: number;
	// maxmp?: number;
	// atk?: number;
	// def?: number;
	// magic?: number;
	// heal?: number;
	// spd?: number;
	// dex?: number;
	// stylish?: number;
	// weight?: number;
	// sheild?: number;
	// parry?: number;
	// mpdrain?: number;
}

interface BadgeFeature {
	name: string;
	abbr: string;
	format?: string;
	type: string;
}
