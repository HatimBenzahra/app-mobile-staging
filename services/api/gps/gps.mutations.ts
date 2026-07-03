// Batch GPS reporting. The mobile app is the source of the commercial's
// position: it uploads throttled points (and flushes an offline buffer as a
// batch on reconnect — hence the array input). Returns the count saved.
export const REPORT_MY_POSITIONS = `
  mutation ReportMyPositions($input: [ReportPositionInput!]!) {
    reportMyPositions(input: $input)
  }
`;
