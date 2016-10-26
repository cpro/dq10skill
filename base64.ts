/**
 * Base64 URI safe
 * [^\x00-\xFF]な文字しか来ない前提
 */
class Base64 {
	/**
	 * btoa
	 */
	public static btoa(b: string): string {
		return window.btoa(b)
			.replace(/[+\/]/g, (m0) => {return m0 == '+' ? '-' : '_';})
			.replace(/=/g, '');
	}
	/**
	 * atob
	 */
	public static atob(a: string): string {
		a = a.replace(/[-_]/g, (m0) => {return m0 == '-' ? '+' : '/';});
		if(a.length % 4 == 1) a += 'A';

		return window.atob(a);
	}
	/**
	 * isValid
	 */
	public static isValid(a: string): boolean {
		return (/^[A-Za-z0-9-_]+$/).test(a);
	}
}

// 非推奨の escape() / unescape() 関数。UTF-8変換のみに使用
declare function escape(str: string): string;
declare function unescape(str: string): string;

/**
 * 通常のUnicode文字列とUTF-8バイト列の相互変換
 * Base64とのデータ受渡に使用
 */
class UTF8 {
	public static toUTF8(raw: string): string {
		return unescape(encodeURIComponent(raw));
	}

	public static fromUTF8(utf8: string): string {
		return decodeURIComponent(escape(utf8));
	}
}
