/// <reference path="typings/hiroba.d.ts" />
declare var skillMap: Dq10Hiroba.SkillMap;
declare var jobNameMaster: Dq10Hiroba.JobNameMaster;

module Dq10Hiroba {
	export class SkillDetail {
		public skillMap: Dq10Hiroba.SkillMap;
		
		load(): void {
			this.skillMap = skillMap;
		}
	}
}
