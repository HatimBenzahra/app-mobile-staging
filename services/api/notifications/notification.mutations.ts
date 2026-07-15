export const REGISTER_DEVICE_TOKEN = `
  mutation RegisterDeviceToken($input: RegisterDeviceTokenInput!) {
    registerDeviceToken(input: $input)
  }
`;

export const UNREGISTER_DEVICE_TOKEN = `
  mutation UnregisterDeviceToken($token: String!) {
    unregisterDeviceToken(token: $token)
  }
`;

export const MARK_NOTIFICATION_READ = `
  mutation MarkNotificationRead($id: Int!) {
    markNotificationRead(id: $id)
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ = `
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;
