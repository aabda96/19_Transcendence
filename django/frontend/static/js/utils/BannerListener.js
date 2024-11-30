export function SetupBannerListener() {
	const elements = document.querySelectorAll('.alert');

	for(const el of elements) {
		const cross =  el.querySelector('svg:last-child')
		if(!cross) continue;

		cross.addEventListener('click', () => {
			el.remove();
		})
	}
}