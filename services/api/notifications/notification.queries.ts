export const MY_NOTIFICATIONS = `
  query MyNotifications {
    myNotifications {
      id
      type
      title
      body
      data
      readAt
      createdAt
    }
  }
`;

export const UNREAD_NOTIFICATION_COUNT = `
  query UnreadNotificationCount {
    unreadNotificationCount
  }
`;
