﻿interface SkillSimulatorDB {
	skillLines: { [skillLineName: string]: SkillLine };
	skillLineOrder: string[];
	vocations: {
		[vocationName: string]: Vocation;
	};
	vocationOrder: string[];
	skillPtsGiven: number[];
	expRequired: {
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
			valid: number
		};
		level: {
			min: number;
			max: number;
			forTrainingMode: number;
		};
		trainingSkillPts: MinMax;
		msp: MinMax;
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
	expTable: number;
}

interface SkillLine {
	id: number;
	unique?: boolean;
	name: string;
	abbr?: string;
	skills: Skill[];
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
		};
		level: MinMax;
		restart: {
			min: number;
			max: number;
			skillPts: number[];
			skillPtsOver5: number;
			expRatio: number;
		}
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