import { Request } from "./Request.js";

export async function getTemplate(name) {
	return Request('GET', `/views/${name}`, undefined, undefined, true); 
}

export function setTemplateVar(html, tplVars) {
	let htmlParsed = html;

	for(const tplKey in tplVars) {
		htmlParsed = htmlParsed.replaceAll(new RegExp(`\{\{${tplKey}\}\}`, 'gm'), tplVars[tplKey])
	}

	return htmlParsed;
}

export function getTemplateError(name) {
	return `<section id="${name}">
		<h2>${name}</h2>
		<p>Error loading ${name}</p>
	</section>`
}