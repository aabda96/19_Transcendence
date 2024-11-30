import { getTemplate } from '../utils/Template.js';
import { SetupBannerListener } from '../utils/BannerListener.js';



export default class HomeView {
  constructor() {
    this.title = 'Home';
  }

  async getHtml() {
    const template = await getTemplate('index');
    return template;
  }
  async init(websocket, url) {
    const html = await this.getHtml();
    document.getElementById('app').innerHTML = html;
    SetupBannerListener();
  }
}
