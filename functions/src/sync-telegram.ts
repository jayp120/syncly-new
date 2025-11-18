/**
 * One-time sync function to update user documents with Telegram data
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

export const syncTelegramToUsers = functions.https.onRequest(async (req, res) => {
  try {
    const db = admin.firestore();
    
    console.log('Starting Telegram sync...');
    
    // Get all active Telegram links
    const telegramUsersSnapshot = await db.collection('telegramUsers')
      .where('isActive', '==', true)
      .get();
    
    console.log(`Found ${telegramUsersSnapshot.size} active Telegram links`);
    
    const results = [];
    
    for (const doc of telegramUsersSnapshot.docs) {
      const telegramData = doc.data();
      const { telegramId, synclyUserId, telegramUsername, telegramFirstName, telegramLastName } = telegramData;
      
      console.log(`Syncing: Telegram ID ${telegramId} -> User ID ${synclyUserId}`);
      
      // Update user document
      const userUpdate: any = {
        telegramChatId: telegramId
      };
      
      if (telegramUsername) userUpdate.telegramUsername = telegramUsername;
      if (telegramFirstName) userUpdate.telegramFirstName = telegramFirstName;
      if (telegramLastName) userUpdate.telegramLastName = telegramLastName;
      
      await db.collection('users').doc(synclyUserId).update(userUpdate);
      
      results.push({
        telegramId,
        userId: synclyUserId,
        status: 'synced'
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Synced ${results.length} Telegram links`,
      results
    });
  } catch (error: any) {
    console.error('Error syncing Telegram links:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
