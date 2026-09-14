import type { TransferOption } from "@/lib/transfers";

export type TransferSelection = {
  calculationKey: string;
  transfer: TransferOption;
};

export type TransferSelectionIdentity = Pick<
  TransferOption,
  | "routeAId"
  | "routeBId"
  | "routeAStartIndex"
  | "routeATransferIndex"
  | "routeBTransferIndex"
  | "routeBEndIndex"
>;

export function getTransferSelectionKey(transfer: TransferSelectionIdentity): string {
  return [
    transfer.routeAId,
    transfer.routeBId,
    transfer.routeAStartIndex,
    transfer.routeATransferIndex,
    transfer.routeBTransferIndex,
    transfer.routeBEndIndex,
  ].join(":");
}

export function findMatchingTransfer(
  identity: TransferSelectionIdentity,
  transfers: TransferOption[],
): TransferOption | null {
  const identityKey = getTransferSelectionKey(identity);
  return transfers.find((transfer) => getTransferSelectionKey(transfer) === identityKey) ??
    transfers.find(
      (transfer) =>
        transfer.routeAId === identity.routeAId &&
        transfer.routeBId === identity.routeBId,
    ) ??
    null;
}

export function resolveTransferSelection(
  selection: TransferSelection | null,
  calculationKey: string | null,
  calculationReady: boolean,
  transfers: TransferOption[],
): TransferOption | null {
  if (!selection || !calculationKey) return null;
  if (!calculationReady) {
    return selection.transfer;
  }

  return findMatchingTransfer(selection.transfer, transfers);
}
