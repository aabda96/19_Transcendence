import { Request } from '../utils/Request.js';
import { getTemplate } from '../utils/Template.js';
import { navigateTo } from '../index.js';
import Notice from '../utils/Notice.js';
import { SetupBannerListener } from '../utils/BannerListener.js';

export default class profilesView {
  constructor() {
    this.title = 'Social';
    this.myData = null;
	this.bannerContainer = document.getElementById('banner-container');
  }
  createBanner(type, message) {
	const banner = document.createElement('div');
	banner.className = `alert ${type}`;
	banner.innerHTML = `
		<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
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
    const template = await getTemplate('social');
    return template;
  }
  
  async init(websocket, url) {
    try {
      this.myData = await Request('GET', '/api/profiles/me');
      const html = await this.getHtml();
      document.getElementById('app').innerHTML = html;
      await this.updateUserList();
      await this.updateFriendList();
      await this.updateIncomingRequests();
      this.initEventListenerTab();

    } catch (error) {
      console.error('Initialization error:', error);
    }
  }

checkFriendandOutgoing(a, b, c) {
  let checkOutgoing = false;
  let checkIsFriend = false;

  for (let i = 0; i < b.length || i < c.length; i++) {
      if (b[i] && a.username === b[i].username) {
        checkOutgoing = true;
        break;
      }
      if (c[i] && a.username === c[i].username) {
        checkIsFriend = true;
        break;
      }
  }
  const onlineIndicator = a.online ? `
  <button class="svg-online" title="Online">
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4ed349" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wifi"><path d="M5 13a10 10 0 0 1 14 0"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 20 0"/><line x1="12" x2="12.01" y1="20" y2="20"/></svg>
  </button>
` : '';

  if (checkOutgoing)
    return `
      <button class="svg-outgoingFriend">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hourglass"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>
      </button>
    `
	else if (checkIsFriend)
		return `
		  ${onlineIndicator}
		  <button class="svg-isFriend">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-round-check"><path d="M2 21a8 8 0 0 1 13.292-6"/><circle cx="10" cy="8" r="5"/><path d="m16 19 2 2 4-4"/></svg>
		  </button>
		`
	else
	return `
		${onlineIndicator}
		<button class="svg-addFriend" data-username="${a.username}">
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-round-plus"><path d="M2 21a8 8 0 0 1 13.292-6"/><circle cx="10" cy="8" r="5"/><path d="M19 16v6"/><path d="M22 19h-6"/></svg>
		</button>
	`
}

  async updateUserList() {
    try {
        const friends = await this.getListOfFriends();
        const users = await this.getListOfUsers();
        const onlineUsers = await this.getOnlineUsersList(); // Get list of online users
        const outgoingFriendRequest = await this.getOutgoingFriendRequest();

        const userList = document.getElementById('user-list');
        const updatedUsers = users.filter(user => user.id !== this.myData.id);

        userList.innerHTML = updatedUsers
            .map((profile) => `
                <li class="item">
                  ${profile.username}
                  ${this.checkFriendandOutgoing({...profile, online: onlineUsers.includes(profile.id)}, outgoingFriendRequest, friends)}
                </li>
            `)
            .join('');

        // Attach event listeners to the add friend buttons
        this.attachAddFriendListeners();

    } catch (error) {
        console.error('Error updating user list:', error);
    }
}

  async updateFriendList() {
    try {
      const friends = await this.getListOfFriends();
      const friendList = document.getElementById('friend-list');
      friendList.innerHTML = friends.length
        ? friends.map((friend) => `
          <li class="item">
            ${friend.username}
            <button class="svg-trash" data-username="${friend.username}">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </button>
          </li>
        `).join('')
        : `<p>No friends</p>`;
      // Attach event listeners to the remove friend buttons
      this.attachRemoveFriendListeners();

    } catch (error) {
      console.error('Error updating friend list:', error);
    }
  }

  async updateIncomingRequests() {
    try {
      const incomingRequests = await this.getListOfIncomingFriendRequests();
      const requestsList = document.getElementById('incoming-requests');
      requestsList.innerHTML = incomingRequests.length
        ? incomingRequests
            .map(
              (request) => `
                <li class="item">
                  ${request.username}
                  <div class="button-container">
                    <button type="button" class="confirm-friend-request" data-username="${request.username}">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor">
                        <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/>
                      </svg>
                    </button>
                    <button type="button" class="refuse-friend-request" data-username="${request.username}">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>
                </li>
            `,
            )
            .join('')
        : `<p>No incoming friend requests</p>`;

      // Attach event listeners to the confirm and refuse buttons
      this.attachIncomingRequestListeners();

    } catch (error) {
      console.error('Error updating incoming requests:', error);
    }
  }

  async addFriend(username) {
    try {
      if (!this.myData)
        throw new Error('myData is not initialized');
      if (username === this.myData.username) {
		this.createBanner('warning', "You can't add yourself as a friend !");
        return;
      }
      const csrftoken = this.getCSRFToken(); // Function to retrieve CSRF token
      const friendProfile = await this.getProfileByUsername(username); // Fetch the profile by username
      if (!friendProfile) {
        // alert('User not found');
		this.createBanner('warning', 'User not found');
        return;
      }
	  console.log(friendProfile.id);
	  console.log(username);
	  console.log("csrftoken is", csrftoken);
      await Request(
        'POST',
        `/api/profiles/friends/${friendProfile.id}`,
        { username },
        { 'X-CSRFToken': csrftoken },
      );

    //   alert('Friend request sent!');
	  this.createBanner('info', 'Friend request sent!');
      await this.updateIncomingRequests(); // Refresh incoming requests
	  navigateTo('/social');

    } catch (error) {
      console.error('Error sending friend request:', error);
    //   alert('Failed to send friend request.');
	  this.createBanner('error', 'Failed to send friend request.');
    }
  }

  async deleteFriend(username) {
    try {
      const csrftoken = this.getCSRFToken(); // Function to retrieve CSRF token
      const friendProfile = await this.getProfileByUsername(username); // Fetch the profile by username
      if (!friendProfile) {
        // alert('User not found');
		this.createBanner('warning', 'User not found');

        return;
      }
      await Request(
        'DELETE',
        `/api/profiles/friends/${friendProfile.id}`,
        { username },
        { 'X-CSRFToken': csrftoken },
      );

    //   alert('Friend removed');
	  this.createBanner('info', 'Friend removed');
      await this.updateFriendList(); // Refresh friend list
	  navigateTo('/social');

    } catch (error) {
      console.error('Error deleting friend:', error);
    //   alert('Failed to delete friend.');
	  this.createBanner('error', 'Failed to delete friend.');
    }
  }

  async confirmFriendRequest(username) {
	  
		try {
			const csrftoken = this.getCSRFToken(); // Function to retrieve CSRF token
			const friendProfile = await this.getProfileByUsername(username); // Fetch the profile by username
			if (!friendProfile) {
				// alert('User not found');
				this.createBanner('warning', 'User not found');
				return;
			}

			await Request(
				'POST',
				`/api/profiles/friends/${friendProfile.id}`,
				{ username },
				{ 'X-CSRFToken': csrftoken },
			);

			// alert('Friend request confirmed!');
			this.createBanner('info', 'Friend request confirmed!');
			await this.updateFriendList(); // Refresh friend list
			await this.updateIncomingRequests(); // Refresh incoming requests

			} catch (error) {
			console.error('Error confirming friend request:', error);
			// alert('Failed to confirm friend request.');
			this.createBanner('error', 'Failed to confirm friend request.');
			navigateTo('/social');
			}
  	
	  }
async refuseFriendRequest(username) {
	try {
			const csrftoken = this.getCSRFToken(); // Function to retrieve CSRF token
			const friendProfile = await this.getProfileByUsername(username); // Fetch the profile by username
			if (!friendProfile) {
				// alert('User not found');
				this.createBanner('warning', 'User not found');
				return;
			}
			await Request(
				'DELETE',
				`/api/profiles/delete_request/${friendProfile.id}`,
				{ username },
				{ 'X-CSRFToken': csrftoken },
			);
			
				// alert('Friend request refused!');	
				this.createBanner('info', 'Friend request refused!');
				  await this.updateFriendList(); // Refresh friend list
				  await this.updateIncomingRequests(); // Refresh incoming requests
				return;
			}
			catch (error) {
			console.error('Error refusing friend request:', error);
			// alert('Failed to refuse friend request.');
			this.createBanner('error', 'Failed to refuse friend request.');
			navigateTo('/social');
			}
		}

  async getListOfUsers() {
    try {
      const data = await Request('GET', '/api/profiles/');
      return data;
    } catch (error) {
      console.error('Error fetching users:', error);
      return []; // Fallback if users data cannot be fetched
    }
  }

  async getListOfFriends() {
    try {
      const data = await Request('GET', '/api/profiles/friends');
      return data;
    } catch (error) {
      console.error('Error fetching friends', error);
      return [];
    }
  }

  async getListOfIncomingFriendRequests() {
    try {
      const data = await Request(
        'GET',
        '/api/profiles/incoming_friend_requests',
      );
      return data;
    } catch (error) {
      console.error('Error fetching incoming friend requests:', error);
      return [];
    }
  }

  async getOutgoingFriendRequest() {
    try {
      const data = await Request(
        'GET',
        '/api/profiles/outgoing_friend_requests',
      );
      return data;
    } catch (e) {
      console.error('Error fetching outgoing friend request:', e);
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

  async getOnlineUsersList() {
    try {
        const data = await Request('GET', '/api/profiles/');
        
        // Filter profiles to only include those who are online and map their IDs
        const onlineUsers = data.filter(profile => profile.online).map(profile => profile.id);

        return onlineUsers;  // Return the list of IDs of online users
    } catch (error) {
        console.error('Error fetching online users:', error);
        return [];
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

  initEventListenerTab() {
    const btnTabs = document.querySelectorAll('.tabLinks');
    const tabs = document.querySelectorAll('.tabContent');

    for(const btn of btnTabs) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        
        for(const btn of btnTabs) {
          btn.classList.remove('active')
        }
        
        btn.classList.add('active')
        const selectedTab = btn.getAttribute('data-tab');
        
        for(const tab of tabs ) {
          if(tab.id !== selectedTab) {
            tab.classList.remove('active')
          } else {
            tab.classList.add('active')
          }
        }
      })
    }
  }

  initEventListeners() {
    // Attach all friend-related event listeners

    this.attachAddFriendListeners();
    this.attachRemoveFriendListeners();
    this.attachIncomingRequestListeners();
  }

  attachAddFriendListeners() {
    const allAddFriendBtns = document.querySelectorAll(".svg-addFriend");

    allAddFriendBtns.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const username = btn.getAttribute('data-username');
        if (username) {
          await this.addFriend(username);
        }
      });
    });
  }

  attachRemoveFriendListeners() {
    const allRemoveFriendBtns = document.querySelectorAll(".svg-trash");

    allRemoveFriendBtns.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const username = btn.getAttribute('data-username');
        if (username) {
          await this.deleteFriend(username);
        }
      });
    });
  }

attachIncomingRequestListeners() {
    const confirmBtns = document.querySelectorAll('.confirm-friend-request');
    const refuseBtns = document.querySelectorAll('.refuse-friend-request');

    confirmBtns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const username = btn.getAttribute('data-username');
        if (username) {
          await this.confirmFriendRequest(username);
        }
      });
    });

    refuseBtns.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
		const username = btn.getAttribute('data-username');
        if (username) {
		console.log(username);
		await this.refuseFriendRequest(username);
		}
      });
    });
  }
}
