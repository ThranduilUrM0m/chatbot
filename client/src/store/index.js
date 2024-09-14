import { usePermissionStore } from './_stores/_permissionStore';
import { useRoleStore } from './_stores/_roleStore';
import { useTokenStore } from './_stores/_tokenStore';
import { useUserStore } from './_stores/_userStore';

const _useStore = {
    usePermissionStore,
    useRoleStore,
    useTokenStore,
    useUserStore
};

export default _useStore;