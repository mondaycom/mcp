export const COLUMN_VALUES_FORMAT_GUIDE =
  'Pass a JSON object serialized once as a string, keyed by column id — not a JSON string of a JSON string. ' +
  'Column ids and labels must come from get_board_info for this board, people ids from list_users_and_teams, never guessed. ' +
  'Formats by column type: text and numbers: "value". long_text: {"text": "..."}. ' +
  'status: {"label": "Done"} or {"index": 1}, and the label must already exist unless createLabelsIfMissing is true. ' +
  'dropdown: {"labels": ["A"]} or {"ids": [1]} — always an array, even for one value. ' +
  'date: {"date": "YYYY-MM-DD"}. timeline: {"from": "YYYY-MM-DD", "to": "YYYY-MM-DD"}. ' +
  'people: {"personsAndTeams": [{"id": 123, "kind": "person"}]}, where kind is "person", "team" or "agent". An AI agent takes kind "agent" with its user id from list_users_and_teams, never "person". ' +
  'board_relation: {"item_ids": [123]}. tags: {"tag_ids": [123]}. checkbox: {"checked": "true"}. ' +
  'link: {"url": "https://...", "text": "..."}. location: {"lat": "40.7", "lng": "-74.0", "address": "..."}, lat and lng are required strings, an address alone fails. ' +
  'email: {"email": "a@b.com", "text": "a@b.com"}. phone: {"phone": "+12125551234", "countryShortName": "US"}, digits only with an optional leading + and no spaces or dashes, uppercase ISO-2 country code. ' +
  'Plain strings fail for email and phone. null clears a column. ' +
  'Example: {"text_col": "New text", "status_col": {"label": "Done"}, "dropdown_col": {"labels": ["A"]}, "date_col": {"date": "2023-05-25"}}';

/**
 * Models often send columnValues double-encoded: a JSON string whose content is itself a JSON
 * string. Unwraps that one level and returns anything else unchanged, so the API stays the judge of
 * every other shape.
 */
export const unwrapDoubleEncodedColumnValues = (columnValues: string): string => {
  try {
    const parsed: unknown = JSON.parse(columnValues);
    return typeof parsed === 'string' ? parsed : columnValues;
  } catch {
    return columnValues;
  }
};
