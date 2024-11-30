import { Request } from '../utils/Request.js';
import {
  getTemplate,
  getTemplateError,
  setTemplateVar,
} from '../utils/Template.js';

export default class ProfileView {
  constructor() {
    this.title = 'Profile';
    this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    this.data = null;
  }

  async getHtml() {
    try {
      this.data = await Request('GET', '/api/profiles/me');
      const { username, victories, loses, points, alias } = this.data;
      const avatar = await this.loadAvatar();

      const template = await getTemplate('profile');

      return setTemplateVar(template, {
        username,
        victories,
        loses,
        points,
        avatar,
		    alias: alias ?? username
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      return getTemplateError('profile');
    }
  }

  async loadAvatar() {
    try {
      const data = await Request('GET', '/api/profiles/get_avatar/');

      if (data.avatar) {
        const base64String = data.avatar.split(',')[1] || data.avatar;
        return `data:image/png;base64,${base64String}`;
      } 
        
      return '/static/img/default.jpg';
    } catch (error) {
      return '/static/img/default.jpg';
    }
  }

  async uploadAvatar(file) {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const data = await Request(
        'POST',
        '/api/profiles/upload_avatar/',
        formData,
        {
          'X-CSRFToken': this.getCookie('csrftoken'),
        },
      );

      if (data.status === 'success') {
        const avatar = await this.loadAvatar();
        document.getElementById('profile-picture').src = avatar;
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
    }
  }

  async updateAlias(newAlias) {
    try {
      const data = await Request(
        'POST',
        '/api/profiles/update_alias/',
        {
          alias: newAlias,
        },
        {
          'X-CSRFToken': this.getCookie('csrftoken'),
        },
      );

      if (data.status === 'success') {
        const usernameElement = document.getElementById('user-status');
        if (usernameElement)
          usernameElement.innerHTML = newAlias;
      } else {
        console.error('Error updating username:', data.message);
      }
    } catch (error) {
      console.error('Error updating username:', error);
    }
  }

  getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === `${name}=`) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  // document.getElementById('dropdownMatchHistory').addEventListener('click', () => {
  //   if (!document.getElementById('matchHistory').classList.contains('visible')) {
  //     document.getElementById('matchHistory').style.display = 'block';
  //   } else {
  //     document.getElementById('matchHistory').style.display = 'none'
  //   }
  //   setTimeout( () => {
  //     document.getElementById('matchHistory').classList.toggle('visible')
  //   }, 5)
  // });


  addEventListeners() {
    document.getElementById('dropdownMatchHistory').addEventListener('click', () => {
      document.getElementById('matchHistory').classList.toggle('visible');
    });

    document
      .getElementById('profile-picture')
      .addEventListener('click', async () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = this.allowedImageTypes.join(',');
        fileInput.onchange = async (event) => {
          const file = event.target.files[0];
          console.log('File selected:', file); // Debug log
          if (file) {
            await this.uploadAvatar(file);
          } else {
            console.log('No file selected'); // Debug log
          }
        };
        fileInput.click();
      });

    const input = document.getElementById('alias')
    if(!input) return;

    const handleSubmitUsername = async () => {
        const username = input.value;
        const error = document.getElementById('errorMsg');
        const divElem = document.createElement('div');
        
        divElem.classList.add('alert');
        divElem.classList.add('danger');

        if (username) {
          if (username.length < 1 || username.length > 15) {
            divElem.innerHTML = `
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                              <p><strong>Error:</strong> Your alias must be maximum <strong>15</strong> characters long !</p>
                              `
            error.appendChild(divElem);
            setTimeout(() => {
              error.removeChild(divElem);
            }, 5000);
            return;
          }
          for (let i = 0; i < username.length; i++) {
            if (username[i] === ' ') {
              divElem.innerHTML = `
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                              <p><strong>Space</strong> character is not allowed in your alias.</p>
                              `
              error.appendChild(divElem);
              setTimeout(() => {
                error.removeChild(divElem);
              }, 5000);
              return;
            }
          }
          await this.updateAlias(username);
          input.setAttribute('disabled', true);
        }
    }

    input.addEventListener('keyup', async (e) => {
        if(e.keyCode === 13) {
            await handleSubmitUsername()
        }
    })
    

    document
      .getElementById('edit-username-button')
      .addEventListener('click', (e) => {
        input.removeAttribute('disabled')
      });

    document
      .getElementById('save-username-button')
      .addEventListener('click', handleSubmitUsername);
  }

  matchHistoryHandling() {
    const matchHistoryElem = document.getElementById('matchHistory');

    if (!this.data.match_history[0])
      matchHistoryElem.textContent = 'No match history.';

    for (let i = 0; this.data.match_history[i]; i++) {
      const ulElem = document.createElement('ul');
      const liDateElem = document.createElement('li');
      const liResultElem = document.createElement('li');
      const liOpponentElem = document.createElement('li');

      this.data.match_history[i].result === 'win' ? liResultElem.classList.add('win') : liResultElem.classList.add('lose');

      liDateElem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-days"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
                              ${this.data.match_history[i].date}
      `
      liResultElem.innerHTML = `${this.data.match_history[i].result === 'win' ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-thumbs-up"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-thumbs-down"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>`}
                                ${this.data.match_history[i].result}
      `
      liOpponentElem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                  ${this.data.match_history[i].opponent}
      `

      ulElem.appendChild(liDateElem);
      ulElem.appendChild(liResultElem);
      ulElem.appendChild(liOpponentElem);

      if (matchHistoryElem.childElementCount)
        matchHistoryElem.insertBefore(ulElem, matchHistoryElem.firstChild);
      else
        matchHistoryElem.appendChild(ulElem);
    }
  }

  async init(websocket, url) {
    const html = await this.getHtml();
    document.getElementById('app').innerHTML = html;
    this.addEventListeners();
    this.matchHistoryHandling();
  }
}
