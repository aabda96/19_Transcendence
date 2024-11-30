import { getTemplate } from '../utils/Template.js';
import { Request } from '../utils/Request.js';
import { navigateTo } from '../index.js';
import { SetupBannerListener } from '../utils/BannerListener.js';

export default class ChatView {
  constructor() {
    this.title = 'Chat';
    this.websocketService = null;
    this.myData = null;
    this.currentRoomName = null;
    this.users = [];
    this.url = location.href;
    this.bannerContainer = document.getElementById('banner-container');
    this.blockedUsers = [];
    this.blockedmeUsers = [];
    this.chatPartner = null;
    this.isActive = false;
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this); // close websocket
  }

  getTypeAlertBanner(type) {
    switch (type) {
      case 'info':
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
      case 'warning':
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
      case 'success':
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>';
      case 'danger':
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>';
      default:
        return;
    }
  }

  createBanner(type, message) {
    const banner = document.createElement('div');
    banner.className = `alert ${type}`;
    banner.innerHTML = `
      ${this.getTypeAlertBanner(type)}
      <span>${message}</span>
      <svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-x" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    `;
    this.bannerContainer.appendChild(banner);
    SetupBannerListener();
    setTimeout(() => {
      banner.remove();
    }, 4000);

    if (location.pathname === '/social') {
      navigateTo('/social');
    }
}

  async getHtml() {
    const template = await getTemplate('chat');
    return template;
  }

  async init(websocketService, url) {
    console.log("url is ", url);
    this.myData = await Request('GET', '/api/profiles/me');
    const html = await this.getHtml();
    document.getElementById('app').innerHTML = html;
    this.websocketService = websocketService;
    await this.fetchUsers();
    this.displayUsers();
    this.displayMyInfos();
    
    const chatUsername = this.getChatUsernameFromUrl(url);
    if (chatUsername) {
      try {
        const userProfile = await this.getProfileByUsername(chatUsername);
        await this.startPrivateChat(userProfile);
      } catch (error) {
        console.error('Error starting private chat: user not found', error);
        this.createBanner('danger', 'User not found or unable to start chat.');
      }
    }

    this.isActive = true;
    window.addEventListener('popstate', this.handleRouteChange.bind(this));
	window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  getChatUsernameFromUrl(url) {
    const match = url.match(/\/chat\/(.+)/);
    return match ? match[1] : null;
  }

  handleRouteChange(event) {
    if (this.isActive) {
      this.leaveChatRoom();
    }
  }
  handleBeforeUnload(event) {
    if (this.isActive && this.currentRoomName) {
      this.sendLeftChatMessage();
      // Optionally, you can set a custom message for the browser's dialog
      // event.returnValue = 'Are you sure you want to leave?';
    }
  }

  leaveChatRoom() {
    if (this.currentRoomName && this.chatPartner) {
      this.sendLeftChatMessage();
      console.log("Left chat message sent");
      this.disconnectFromCurrentRoom();
    }
    this.isActive = false;
  }

  disconnectFromCurrentRoom() {
    if (this.websocketService && this.currentRoomName) {
      this.websocketService.disconnect(this.currentRoomName);
      this.currentRoomName = null;
      this.chatPartner = null;
    }
  }

  sendLeftChatMessage() {
    if (this.websocketService && this.currentRoomName) {
      const messageData = JSON.stringify({
        'type': 'left_chat',
        'username': this.myData.username
      });
      this.websocketService.send(this.currentRoomName, messageData);
    }
  }

  async getProfileByUsername(username) {
    try {
      const data = await Request('GET', `/api/profiles/user/${username}`);
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }
  async getwhoblockedme() {
    try {
      const response = await fetch('/api/profiles/blockme');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      this.blockedmeUsers = data;
      return data;
    } catch (error) {
      console.error("Error fetching blocked users:", error);
      return [];
    }
  }

  getCSRFToken() {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, 'csrftoken'.length + 1) === 'csrftoken' + '=') {
          cookieValue = decodeURIComponent(
            cookie.substring('csrftoken'.length + 1),
          );
          break;
        }
      }
    }
    return cookieValue;
  }
  async message_notif(username) {
    try {
      if (!this.myData) {
      throw new Error('User data not available');
      }
      const notificationKey = `notification_sent_${username.username}_message`;
      if (this.myData.sentNotifications && this.myData.sentNotifications[notificationKey]) {
        console.log("Message notification already sent to this user.");
        return;
    }
      console.log("Sending notification for username:", username);
      username = username.username;
          
      console.log("Extracted username:", username);
      const friendProfile = await this.getProfileByUsername(username);
      const username_id = friendProfile.id;
      console.log("Friend profile ID:", username_id);
      const csrftoken = this.getCSRFToken();
      await Request(
      'POST',
      `/api/profiles/chat/${username_id}`,
      { username },
      { 'X-CSRFToken': csrftoken },
      );
          if (!this.myData.sentNotifications) {
              this.myData.sentNotifications = {};
          }
      this.myData.sentNotifications[notificationKey] = true;
      localStorage.setItem('sentNotifications', JSON.stringify(this.myData.sentNotifications));
        this.createBanner('info', 'Message sent !');
      } catch (error) {
        console.error('Error sending message invitation:', error);
      }
      }
    async message_notif_game(username) {
    try {
      if (!this.myData) {
      throw new Error('User data not available');
      }
      const notificationKey = `notification_sent_${username.username}_game`;
      if (this.myData.sentNotifications && this.myData.sentNotifications[notificationKey]) {
      console.log("Notification already sent for this user.");
      return;
    }
      console.log("Sending notification for username:", username);
      username = username.username;
      const friendProfile = await this.getProfileByUsername(username);
      const username_id = friendProfile.id;
      console.log("Friend profile ID:", username_id);
      const csrftoken = this.getCSRFToken();
      await Request(
      'POST',
      `/api/profiles/game/${username_id}`,
      { username },
      { 'X-CSRFToken': csrftoken },
      );
      if (!this.myData.sentNotifications) {
      this.myData.sentNotifications = {};
    }
    this.myData.sentNotifications[notificationKey] = true;
    localStorage.setItem('sentNotifications', JSON.stringify(this.myData.sentNotifications));
      this.createBanner('info', 'Message sent !');
    } catch (error) {
      console.error('Error sending message invitation:', error);
    }
    }
  async blockuser(username, isBlocked) {
    try {
        if (!this.myData) {
            throw new Error('User data not available');
        }
        const userProfile = await this.getProfileByUsername(username);
        const userId = userProfile.id;
        const csrfToken = this.getCSRFToken();
        
        if (!isBlocked) {
          const response = await fetch(`/api/profiles/block/${userId}`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'X-CSRFToken': csrfToken
              },
              body: JSON.stringify({ username })
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.detail || 'Failed to block user');
          }

          this.createBanner('success', 'User blocked successfully !');
        } else {
          const response = await fetch(`/api/profiles/block/${userId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({ username })
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.detail || 'Failed to unblock user');
          }

          this.createBanner('success', 'User unblocked successfully !');
        }
        const blockedUsers = await this.getBlockedUsers();
        console.log('Blocked users:', blockedUsers);
        navigateTo('/chat');
    } catch (error) {
        console.error('Error blocking user:', error);
        this.createBanner('danger', error.message);
    }
}

async getBlockedUsers() {
    try {
      const response = await fetch('/api/profiles/block');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      this.blockedUsers = data;
      return data;
    } catch (error) {
      console.error("Error fetching blocked users:", error);
      return [];
    }
  }

  async fetchUsers() {
    try {
        const users = await Request('GET', '/api/profiles/');
        // Filter out the current user and ensure unique users by username
        const uniqueUsers = Array.from(
            new Map(users.map(user => [user.username, user]))
            .values()
        ).filter(user => user.id !== this.myData.id);
        
        this.users = uniqueUsers;
    } catch (error) {
        console.error('Error fetching users:', error);
        this.users = [];
    }
}

async displayUsers() {
    await this.getBlockedUsers();
    await this.getwhoblockedme();
    
    const userList = document.createElement('ul');
    userList.id = 'user-list-chat';
    userList.className = 'user-list-chat';

    // Create a Set to track displayed usernames
    const displayedUsers = new Set();

    this.users.forEach(user => {
        // Only display user if they're online and haven't been displayed yet
        if (user.online && !displayedUsers.has(user.username)) {
            displayedUsers.add(user.username);
            
            const userElement = document.createElement('li');
            userElement.className = 'user-item';
            
            const isBlocked = this.blockedUsers.some(blockedUser => blockedUser.id === user.id);
            const isBlockedme = this.blockedmeUsers.some(blockedUser => blockedUser.id === user.id);

            if (isBlocked) {
                userElement.classList.add('isBlocked');
            }
            if (isBlockedme) {
                userElement.classList.add('isBlockedme');
            }
            
            userElement.innerHTML = `
                ${user.username}
                <div class="svgContainer">
                    <span class="itemProfile"><svg class="chatSvg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M512 80c8.8 0 16 7.2 16 16V416c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16V96c0-8.8 7.2-16 16-16H512zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H512c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zM208 256a64 64 0 1 0 0-128 64 64 0 1 0 0 128zm-32 32c-44.2 0-80 35.8-80 80c0 8.8 7.2 16 16 16H304c8.8 0 16-7.2 16-16c0-44.2-35.8-80-80-80H176zM376 144c-13.3 0-24 10.7-24 24s10.7 24 24 24h80c13.3 0 24-10.7 24-24s-10.7-24-24-24H376zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24h80c13.3 0 24-10.7 24-24s-10.7-24-24-24H376z"/></svg></span>
                    <span class="itemChat"><svg class="chatSvg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path d="M88.2 309.1c9.8-18.3 6.8-40.8-7.5-55.8C59.4 230.9 48 204 48 176c0-63.5 63.8-128 160-128s160 64.5 160 128s-63.8 128-160 128c-13.1 0-25.8-1.3-37.8-3.6c-10.4-2-21.2-.6-30.7 4.2c-4.1 2.1-8.3 4.1-12.6 6c-16 7.2-32.9 13.5-49.9 18c2.8-4.6 5.4-9.1 7.9-13.6c1.1-1.9 2.2-3.9 3.2-5.9zM0 176c0 41.8 17.2 80.1 45.9 110.3c-.9 1.7-1.9 3.5-2.8 5.1c-10.3 18.4-22.3 36.5-36.6 52.1c-6.6 7-8.3 17.2-4.6 25.9C5.8 378.3 14.4 384 24 384c43 0 86.5-13.3 122.7-29.7c4.8-2.2 9.6-4.5 14.2-6.8c15.1 3 30.9 4.5 47.1 4.5c114.9 0 208-78.8 208-176S322.9 0 208 0S0 78.8 0 176zM432 480c16.2 0 31.9-1.6 47.1-4.5c4.6 2.3 9.4 4.6 14.2 6.8C529.5 498.7 573 512 616 512c9.6 0 18.2-5.7 22-14.5c3.8-8.8 2-19-4.6-25.9c-14.2-15.6-26.2-33.7-36.6-52.1c-.9-1.7-1.9-3.4-2.8-5.1C622.8 384.1 640 345.8 640 304c0-94.4-87.9-171.5-198.2-175.8c4.1 15.2 6.2 31.2 6.2 47.8l0 .6c87.2 6.7 144 67.5 144 127.4c0 28-11.4 54.9-32.7 77.2c-14.3 15-17.3 37.6-7.5 55.8c1.1 2 2.2 4 3.2 5.9c2.5 4.5 5.2 9 7.9 13.6c-17-4.5-33.9-10.7-49.9-18c-4.3-1.9-8.5-3.9-12.6-6c-9.5-4.8-20.3-6.2-30.7-4.2c-12.1 2.4-24.7 3.6-37.8 3.6c-61.7 0-110-26.5-136.8-62.3c-16 5.4-32.8 9.4-50 11.8C279 439.8 350 480 432 480z"/></svg></span>
                    <span class="itemPlay"><svg class="chatSvg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path d="M192 112c-79.5 0-144 64.5-144 144s64.5 144 144 144H448c79.5 0 144-64.5 144-144s-64.5-144-144-144H192zM0 256C0 150 86 64 192 64H448c106 0 192 86 192 192s-86 192-192 192H192C86 448 0 362 0 256zm232-56v32h32c13.3 0 24 10.7 24 24s-10.7 24-24 24H232v32c0 13.3-10.7 24-24 24s-24-10.7-24-24V280H152c-13.3 0-24-10.7-24-24s10.7-24 24-24h32V200c0-13.3 10.7-24 24-24s24 10.7 24 24zm168 72a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm32-64a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/></svg></span>
                    ${isBlocked ? 
                        '<span class="itemUnblock"><svg class="chatSvg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path d="M144 128a80 80 0 1 1 160 0 80 80 0 1 1 -160 0zm208 0A128 128 0 1 0 96 128a128 128 0 1 0 256 0zM49.3 464c8.9-63.3 63.3-112 129-112h91.4c49.3 0 92.1 27.3 114.3 67.7V352c0-2.1 .1-4.2 .3-6.3c-31-26-71-41.7-114.6-41.7H178.3C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H392.6c-5.4-9.4-8.6-20.3-8.6-32V464H49.3zM496 272c0-17.7 14.3-32 32-32s32 14.3 32 32h48c0-44.2-35.8-80-80-80s-80 35.8-80 80v48c-17.7 0-32 14.3-32 32V480c0 17.7 14.3 32 32 32H608c17.7 0 32-14.3 32-32V352c0-17.7-14.3-32-32-32H560 512 496V272z"/></svg></span>' : 
                        '<span class="itemBlock"><svg class="chatSvg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M385.1 419.1L92.9 126.9C64.8 162.3 48 207.2 48 256c0 114.9 93.1 208 208 208c48.8 0 93.7-16.8 129.1-44.9zm33.9-33.9C447.2 349.7 464 304.8 464 256c0-114.9-93.1-208-208-208c-48.8 0-93.7 16.8-129.1 44.9L419.1 385.1zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z"/></svg></span>'
                    }
                </div>
            `;

            // Add event listeners
            const controls = userElement.querySelector('.svgContainer');
            controls.children[0].onclick = () => this.viewUserSummaries(user);
            
            if (!isBlocked && !isBlockedme) {
                controls.children[1].onclick = () => this.waitingScreen(user);
                controls.children[2].onclick = () => this.waitingScreen_game(user);
            }
            controls.children[3].onclick = () => this.blockuser(user.username, isBlocked);

            userList.appendChild(userElement);
        }
    });

    const chatContainer = document.getElementById('listOfUsers');
    if (chatContainer) {
        // Clear existing content before appending
        chatContainer.innerHTML = '';
        chatContainer.appendChild(userList);
    }
}

  viewUserSummaries(user) {
	this.url = 'https://127.0.0.1/chat/';
    const sectionElem = document.getElementById('chat');
    let articleElem = document.getElementById('articleContentContainer');
    articleElem.remove();
	this.leaveChatRoom();
    articleElem = document.createElement('article');
    articleElem.id = 'articleContentContainer';
    articleElem.classList.add('chatArticle');
    articleElem.innerHTML = `
      <h2>${user.username}</h2>
      <hr>
      <div class="userInfo">
        <div class="first-group">
                  <img 
          id="chatAvatar" 
          class="chatAvatar" 
          alt="Profile Picture" 
          src="${user.avatar ? `data:image/png;base64,${user.avatar}` : '/static/img/default.jpg'}">
        <p id="userInfoUsername">${user.username}</p>
        </div>
        <div class="score-grid">
          <div class="score-card">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" fill="currentColor" width="32" height="32"><path d="M400 0L176 0c-26.5 0-48.1 21.8-47.1 48.2c.2 5.3 .4 10.6 .7 15.8L24 64C10.7 64 0 74.7 0 88c0 92.6 33.5 157 78.5 200.7c44.3 43.1 98.3 64.8 138.1 75.8c23.4 6.5 39.4 26 39.4 45.6c0 20.9-17 37.9-37.9 37.9L192 448c-17.7 0-32 14.3-32 32s14.3 32 32 32l192 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-26.1 0C337 448 320 431 320 410.1c0-19.6 15.9-39.2 39.4-45.6c39.9-11 93.9-32.7 138.2-75.8C542.5 245 576 180.6 576 88c0-13.3-10.7-24-24-24L446.4 64c.3-5.2 .5-10.4 .7-15.8C448.1 21.8 426.5 0 400 0zM48.9 112l84.4 0c9.1 90.1 29.2 150.3 51.9 190.6c-24.9-11-50.8-26.5-73.2-48.3c-32-31.1-58-76-63-142.3zM464.1 254.3c-22.4 21.8-48.3 37.3-73.2 48.3c22.7-40.3 42.8-100.5 51.9-190.6l84.4 0c-5.1 66.3-31.1 111.2-63 142.3z"></path></svg>
            <div class="score-card-text">
              <p>Victories</p>
              <p>${user.victories}</p>
            </div>
          </div>

          <div class="score-card">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" width="32" height="32"><path d="M352 493.4c-29.6 12-62.1 18.6-96 18.6s-66.4-6.6-96-18.6L160 288l0-16-32 0 0 16 0 189.8C51.5 433.5 0 350.8 0 256C0 114.6 114.6 0 256 0S512 114.6 512 256c0 94.8-51.5 177.5-128 221.8L384 288l0-16-32 0 0 16 0 205.4zM208 336l0 32c0 26.5 21.5 48 48 48s48-21.5 48-48l0-32c0-26.5-21.5-48-48-48s-48 21.5-48 48zm-91.2-98.4c21.6-28.8 64.8-28.8 86.4 0l25.6-19.2c-34.4-45.9-103.2-45.9-137.6 0l25.6 19.2zm278.4 0l25.6-19.2c-34.4-45.9-103.2-45.9-137.6 0l25.6 19.2c21.6-28.8 64.8-28.8 86.4 0z"></path></svg>
            <div class="score-card-text">
              <p>Loses</p>
              <p>${user.loses}</p>
            </div>
          </div>  

          <div class="score-card">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" fill="currentColor" width="32" height="32"><path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"></path></svg>
            <div class="score-card-text">
              <p>Points</p>
              <p>${user.points}</p>
            </div>
          </div>
        </div>
    `;
    sectionElem.insertBefore(articleElem, sectionElem.firstChild);
  }

  waitingScreen(user) {
    // if (this.url == 'https://127.0.0.1/chat') {
      this.message_notif(user);
    // }
    const sectionElem = document.getElementById('chat');
    let articleElem = document.getElementById('articleContentContainer');
    articleElem.remove();
    articleElem = document.createElement('article');
    articleElem.id = 'articleContentContainer';
    articleElem.classList.add('chatArticle');
    articleElem.innerHTML = `
      <h2><center>Waiting for ${user.username} to accept your chat invitation</center></h2>
        <hr>
        <div class="waitingSvgContainer">
          <div class="loader"></div>
        </div>
    `;
    sectionElem.insertBefore(articleElem, sectionElem.firstChild);
  }
  waitingScreen_game(user) {
    this.message_notif_game(user);
    const sectionElem = document.getElementById('chat');
    let articleElem = document.getElementById('articleContentContainer');
    articleElem.remove();
    articleElem = document.createElement('article');
    articleElem.id = 'articleContentContainer';
    articleElem.classList.add('chatArticle');
    articleElem.innerHTML = `
      <h2><center>Waiting for ${user.username} to accept your chat invitation</center></h2>
        <hr>
        <div class="waitingSvgContainer">
          <div class="loader"></div>
        </div>
    `;
    sectionElem.insertBefore(articleElem, sectionElem.firstChild);
  }

  startPrivateChat(user) {
    if (this.url == 'https://127.0.0.1/chat') {
      this.message_notif(user);
    }
    const sectionElem = document.getElementById('chat');
    let articleElem = document.getElementById('articleContentContainer');
    articleElem.remove();
    articleElem = document.createElement('article');
    articleElem.id = 'articleContentContainer';
    articleElem.classList.add('chatArticle');
    articleElem.innerHTML = `
      <h2 id="chat-header">Chat with ${user.username}</h2>
      <hr>
      <div id="chat-log" class="chatLog"></div>
        <hr>
        <div class="inputContainer">
          <input id="chat-message-input" class="inputChatMsg" type="text" placeholder="Type a message here">
          <button id="chat-message-send" class="btn-chatSend">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-send"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </div>
    `;
    sectionElem.insertBefore(articleElem, sectionElem.firstChild);
    document.getElementById('chat-message-send').onclick = () => this.sendMessage();
    document.getElementById('chat-message-input').addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });
    this.chatPartner = user;
    // console.log("Chat partner:", this.chatPartner);
    const roomName = this.generatePrivateRoomName(this.myData.id, user.id);
    
    if (this.currentRoomName) {
      this.websocketService.disconnect(this.currentRoomName);
    }
    
    this.connectToRoomChat(roomName);
    this.updateChatHeader(user.username);
    document.getElementById('chat-log').innerHTML = '';
    
    this.currentRoomName = roomName;
    this.isActive = true;
    history.pushState(null, null, `/chat/${user.username}`);
  }

  generatePrivateRoomName(userId1, userId2) {
    // Ensure consistent room naming regardless of the order of user IDs
    return `private_${Math.min(userId1, userId2)}_${Math.max(userId1, userId2)}`;
  }
  cleanup() {
    this.leaveChatRoom();
    window.removeEventListener('popstate', this.handleRouteChange);
	window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }

  updateChatHeader(username) {
    const chatHeader = document.getElementById('chat-header');
    if (chatHeader) {
      chatHeader.textContent = `Chat with ${username}`;
    } else {
      const header = document.createElement('h2');
      header.id = 'chat-header';
      header.textContent = `Chat with ${username}`;
      document.getElementById('chat-log').before(header);
    }
  }

  connectToRoomChat(roomName) {
    const url = `/chat`;
    this.websocketService.chat_connect_to_room(roomName, url);
    this.websocketService.connections[roomName].onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'left_chat') {
        this.handlePartnerLeftChat(data.username);
      } else {
        this.addMessageToChatLog(data.username, data.message);
      }
    };
  }

  handlePartnerLeftChat(username) {
	try {
    this.addMessageToChatLog('System', `${username} has left the chat.`);}
	catch (error) { console.error('Error handling partner left chat:', error); }
	  
    navigateTo('/chat');
    this.createBanner('warning', `<strong>${username}</strong> has left the chat.`);
  }

  sendMessage() {
    const messageInput = document.getElementById('chat-message-input');
    const message = messageInput.value;
    if (message.trim() !== "" && this.currentRoomName) {
      const messageData = JSON.stringify({
        'type': 'chat_message',
        'message': message,
      });
      this.websocketService.send(this.currentRoomName, messageData);
      messageInput.value = '';
    }
  }

  sendLeftChatMessage() {
    if (this.websocketService && this.currentRoomName) {
      const messageData = JSON.stringify({
        'type': 'left_chat',
        'username': this.myData.username
      });
      this.websocketService.send(this.currentRoomName, messageData);
    }
  }

  addMessageToChatLog(username, message) {
    const chatLog = document.getElementById('chat-log');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('msgContainer');
    if (username === this.myData.username) {
      messageDiv.classList.add('own');
    }
    messageDiv.innerHTML = `
      <div class="chatContent">
        <div class="chatMsgUser">${username}:</div>
        <div class="chatMsgContent">${message}</div>
      </div>
    `;
    chatLog.appendChild(messageDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  displayMyInfos() {
    document.getElementById('chat-header').textContent = this.myData.username;
    document.getElementById('userInfoUsername').textContent = this.myData.username;
    let myAvatar;
    if (this.myData.avatar) {
      myAvatar = 'data:image/png;base64,' + this.myData.avatar;
    } else {
      myAvatar = '/static/img/default.jpg';
    }
    const imgElem = document.createElement('img');
    imgElem.alt = "Profile Picture";
    imgElem.classList.add("chatAvatar");
    imgElem.src = myAvatar;
    document.getElementById('chatFirstGroup').insertBefore(imgElem, document.getElementById('chatFirstGroup').firstChild);
    document.getElementById('scoreVictories').textContent = this.myData.victories;
    document.getElementById('scoreLoses').textContent = this.myData.loses;
    document.getElementById('scorePoints').textContent = this.myData.points;
  }
}

export { ChatView };