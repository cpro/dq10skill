declare module Dq10Hiroba {
	interface SkillMap {
		[skillLineName: string]: {
			total: number;
			skillList: Tokugi[];
			jobSkillPoints: JobSkillPoint[];
		}
	}

	interface Tokugi {
		skillName: string;
		skillDetail: string;
		isEnabled: boolean;
		isHissatsu: boolean;
		isChance: boolean;
		point: number;
		isCharge: boolean;
	}

	interface JobSkillPoint {
		job: string;
		value: number;
	}

	interface JobNameMaster {
		[job: string]: string;
	}
}
