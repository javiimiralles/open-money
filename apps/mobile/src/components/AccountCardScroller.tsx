import { ScrollView, StyleSheet, View } from 'react-native';

import type { AccountListItem } from '@/hooks/use-accounts';
import { spacing } from '@/theme/tokens';

import { AccountCard } from './AccountCard';
import { AddAccountCard } from './AddAccountCard';

export const ACCOUNT_CARD_WIDTH = 176;

export interface AccountCardScrollerProps {
  accounts: AccountListItem[];
  onPress: (accountId: number) => void;
  /** Privacy mode forwarded to every card. */
  hidden?: boolean;
  /** Highlights the matching card as selected; no highlight when null. */
  selectedId?: number | null;
  /** Renders an add-account card as the last item when provided. */
  onAddAccount?: () => void;
}

export function AccountCardScroller({
  accounts,
  onPress,
  hidden = false,
  selectedId = null,
  onAddAccount,
}: AccountCardScrollerProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
      {accounts.map((account) => (
        <View key={account.id} style={styles.item}>
          <AccountCard
            account={account}
            onPress={() => onPress(account.id)}
            hidden={hidden}
            selected={account.id === selectedId}
          />
        </View>
      ))}
      {onAddAccount ? (
        <View style={styles.item}>
          <AddAccountCard onPress={onAddAccount} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  item: {
    width: ACCOUNT_CARD_WIDTH,
  },
});
