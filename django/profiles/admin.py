from django.contrib import admin
from .models import ProfileModel, FriendRequestModel

@admin.register(ProfileModel)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'victories', 'loses', 'points')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('victories', 'loses', 'points')
    def friends(self, obj):
        return ", ".join([str(friend.user.username) for friend in obj.get_friends()])

@admin.register(FriendRequestModel)
class FriendRequestAdmin(admin.ModelAdmin):
    list_display = ('author', 'target')
    search_fields = ('author__user__username', 'target__user__username')

    actions = ['accept_requests', 'decline_requests']

    def accept_requests(self, request, queryset):
        for friend_request in queryset:
            friend_request.accept()
        self.message_user(request, "Selected friend requests have been accepted.")

    def decline_requests(self, request, queryset):
        queryset.delete()
        self.message_user(request, "Selected friend requests have been declined.")

    accept_requests.short_description = "Accept selected friend requests"
    decline_requests.short_description = "Decline selected friend requests"
