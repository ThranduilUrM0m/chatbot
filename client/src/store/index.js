import { useConversationStore } from './_stores/_conversationStore';
import { useNotificationStore } from './_stores/_notificationStore';
import { usePermissionStore } from './_stores/_permissionStore';
import { useRoleStore } from './_stores/_roleStore';
import { useTokenStore } from './_stores/_tokenStore';
import { useUserStore } from './_stores/_userStore';

const _useStore = {
    useConversationStore,
    useNotificationStore,
    usePermissionStore,
    useRoleStore,
    useTokenStore,
    useUserStore
};

export default _useStore;