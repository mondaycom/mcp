export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  CompareValue: { input: any; output: any; }
  /** A date. */
  Date: { input: any; output: any; }
  /** A multipart file */
  File: { input: any; output: any; }
  /** An ISO 8601-encoded datetime (e.g., 2024-04-09T13:45:30Z) */
  ISO8601DateTime: { input: any; output: any; }
  /** A JSON formatted string. */
  JSON: { input: any; output: any; }
  policy__Policy: { input: any; output: any; }
};

/** Your monday.com account */
export type Account = {
  __typename?: 'Account';
  /** The number of active member users in the account */
  active_members_count?: Maybe<Scalars['Int']['output']>;
  /** The account's country two-letter code in ISO3166 format */
  country_code?: Maybe<Scalars['String']['output']>;
  /** The first day of the week for the account (sunday / monday) */
  first_day_of_the_week: FirstDayOfTheWeek;
  /** The account's unique identifier. */
  id: Scalars['ID']['output'];
  /** The account's logo. */
  logo?: Maybe<Scalars['String']['output']>;
  /** The account's name. */
  name: Scalars['String']['output'];
  /** The account's payment plan. */
  plan?: Maybe<Plan>;
  /** The account's active products */
  products?: Maybe<Array<Maybe<AccountProduct>>>;
  /** Show weekends in timeline */
  show_timeline_weekends: Scalars['Boolean']['output'];
  /** The product the account signed up to first. */
  sign_up_product_kind?: Maybe<Scalars['String']['output']>;
  /** The account's slug. */
  slug: Scalars['String']['output'];
  /** The account's tier. */
  tier?: Maybe<Scalars['String']['output']>;
};

/** The product a workspace is used in. */
export type AccountProduct = {
  __typename?: 'AccountProduct';
  /** The account product default workspace id */
  default_workspace_id?: Maybe<Scalars['ID']['output']>;
  /** The account product id */
  id?: Maybe<Scalars['ID']['output']>;
  /**
   * The account product kind (core / marketing / crm / software /
   * projectManagement / project_management / service / forms / whiteboard).
   */
  kind?: Maybe<Scalars['String']['output']>;
};

/** A role in the account */
export type AccountRole = {
  __typename?: 'AccountRole';
  /** The ID of the role */
  id?: Maybe<Scalars['ID']['output']>;
  /** The name of the role */
  name?: Maybe<Scalars['String']['output']>;
  /** The type of the role */
  roleType?: Maybe<Scalars['String']['output']>;
};

/** Error that occurred during activation. */
export type ActivateUsersError = {
  __typename?: 'ActivateUsersError';
  /** The error code. */
  code?: Maybe<ActivateUsersErrorCode>;
  /** The error message. */
  message?: Maybe<Scalars['String']['output']>;
  /** The id of the user that caused the error. */
  user_id?: Maybe<Scalars['ID']['output']>;
};

/** Error codes for activating users. */
export enum ActivateUsersErrorCode {
  CannotUpdateSelf = 'CANNOT_UPDATE_SELF',
  ExceedsBatchLimit = 'EXCEEDS_BATCH_LIMIT',
  Failed = 'FAILED',
  InvalidInput = 'INVALID_INPUT',
  UserNotFound = 'USER_NOT_FOUND'
}

/** Result of activating users. */
export type ActivateUsersResult = {
  __typename?: 'ActivateUsersResult';
  /** The users that were activated. */
  activated_users?: Maybe<Array<User>>;
  /** Errors that occurred during activation. */
  errors?: Maybe<Array<ActivateUsersError>>;
};

/** An activity log event */
export type ActivityLogType = {
  __typename?: 'ActivityLogType';
  account_id: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  /** The item's column values in string form. */
  data: Scalars['String']['output'];
  entity: Scalars['String']['output'];
  event: Scalars['String']['output'];
  id: Scalars['String']['output'];
  user_id: Scalars['String']['output'];
};

export type AggregateBasicAggregationResult = {
  __typename?: 'AggregateBasicAggregationResult';
  result?: Maybe<Scalars['Float']['output']>;
};

export enum AggregateFromElementType {
  /** A single table to select from */
  Table = 'TABLE'
}

export type AggregateFromTableInput = {
  id: Scalars['ID']['input'];
  /** Always TABLE */
  type: AggregateFromElementType;
};

export type AggregateGroupByElementInput = {
  column_id: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type AggregateGroupByResult = {
  __typename?: 'AggregateGroupByResult';
  value_boolean?: Maybe<Scalars['Boolean']['output']>;
  value_float?: Maybe<Scalars['Float']['output']>;
  value_int?: Maybe<Scalars['Int']['output']>;
  value_string?: Maybe<Scalars['String']['output']>;
};

export type AggregateQueryInput = {
  /** Table to select from */
  from: AggregateFromTableInput;
  /** Group by elements */
  group_by?: InputMaybe<Array<AggregateGroupByElementInput>>;
  /** Max number of results to return */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** ItemsQuery filter and sort. If not provided, all items will be returned. */
  query?: InputMaybe<ItemsQuery>;
  /** Select elements to return. Each element must have either a function or column property. If selecting a column or transformative function, the element must appear in group by. */
  select: Array<AggregateSelectElementInput>;
};

export type AggregateQueryResult = {
  __typename?: 'AggregateQueryResult';
  results?: Maybe<Array<AggregateResultSet>>;
};

export type AggregateResult = AggregateBasicAggregationResult | AggregateGroupByResult;

export type AggregateResultEntry = {
  __typename?: 'AggregateResultEntry';
  alias?: Maybe<Scalars['String']['output']>;
  value?: Maybe<AggregateResult>;
};

export type AggregateResultSet = {
  __typename?: 'AggregateResultSet';
  entries?: Maybe<Array<AggregateResultEntry>>;
};

export type AggregateSelectColumnInput = {
  column_id: Scalars['String']['input'];
};

export type AggregateSelectElementInput = {
  /** Alias for the selected element */
  as: Scalars['String']['input'];
  /** Column to select. Required if type is COLUMN. If selecting a column, the element must have a matching group by element with the same column_id or alias, if present. */
  column?: InputMaybe<AggregateSelectColumnInput>;
  /** Function to select. Required if type is FUNCTION. If selecting a transformative function, the element must have a matching group by element with the same alias. If selecting an aggregative function, the select element must not have a matching group by element. */
  function?: InputMaybe<AggregateSelectFunctionInput>;
  /** Type of the selected element */
  type: AggregateSelectElementType;
};

export enum AggregateSelectElementType {
  /** A column to select */
  Column = 'COLUMN',
  /** A function to select */
  Function = 'FUNCTION'
}

export type AggregateSelectFunctionInput = {
  /** Function to select. Required if type is FUNCTION */
  function: AggregateSelectFunctionName;
  params?: InputMaybe<Array<AggregateSelectElementInput>>;
};

/** Function to select. Required if type is FUNCTION */
export enum AggregateSelectFunctionName {
  /** Average the values of the items */
  Average = 'AVERAGE',
  /** Check if the value is between two values */
  Between = 'BETWEEN',
  /** Conditional case statement */
  Case = 'CASE',
  /** Extract color value */
  Color = 'COLOR',
  /** Count the number of values */
  Count = 'COUNT',
  /** Count the number of distinct values of the items */
  CountDistinct = 'COUNT_DISTINCT',
  /** Count the number of items */
  CountItems = 'COUNT_ITEMS',
  /** Count the number of keys in the object */
  CountKeys = 'COUNT_KEYS',
  /** Count the number of subitems */
  CountSubitems = 'COUNT_SUBITEMS',
  /** Extract date component */
  Date = 'DATE',
  /** Truncate date to day precision */
  DateTruncDay = 'DATE_TRUNC_DAY',
  /** Truncate date to month precision */
  DateTruncMonth = 'DATE_TRUNC_MONTH',
  /** Truncate date to quarter precision */
  DateTruncQuarter = 'DATE_TRUNC_QUARTER',
  /** Truncate date to week precision */
  DateTruncWeek = 'DATE_TRUNC_WEEK',
  /** Truncate date to year precision */
  DateTruncYear = 'DATE_TRUNC_YEAR',
  /** Get the running duration of the items */
  DurationRunning = 'DURATION_RUNNING',
  /** Get end date from date range */
  EndDate = 'END_DATE',
  /** Check if values are equal */
  Equals = 'EQUALS',
  /** Get the first value */
  First = 'FIRST',
  /** Flatten nested values */
  Flatten = 'FLATTEN',
  /** Extract hour from datetime */
  Hour = 'HOUR',
  /** Extract ID value */
  Id = 'ID',
  /** Check if status is done */
  IsDone = 'IS_DONE',
  /** Extract label text */
  Label = 'LABEL',
  /** Get the leftmost characters */
  Left = 'LEFT',
  /** Get the length of the value */
  Length = 'LENGTH',
  /** Convert text to lowercase */
  Lower = 'LOWER',
  /** Get the maximum value of the items */
  Max = 'MAX',
  /** Get the median of the values of the items */
  Median = 'MEDIAN',
  /** Get the minimum value of the items */
  Min = 'MIN',
  /** Get the minimum and maximum values of the items */
  MinMax = 'MIN_MAX',
  /** No function applied */
  None = 'NONE',
  /** Extract order value */
  Order = 'ORDER',
  /** Extract person information */
  Person = 'PERSON',
  /** Extract phone country short name */
  PhoneCountryShortName = 'PHONE_COUNTRY_SHORT_NAME',
  /** Get raw value without formatting */
  Raw = 'RAW',
  /** Get start date from date range */
  StartDate = 'START_DATE',
  /** Sum the values of the items */
  Sum = 'SUM',
  /** Remove whitespace from text */
  Trim = 'TRIM',
  /** Convert text to uppercase */
  Upper = 'UPPER'
}

/** Input for app feature release data. */
export type AppFeatureReleaseDataInput = {
  /** The URL for the release. */
  url?: InputMaybe<Scalars['String']['input']>;
};

/** Input for updating an app feature release. */
export type AppFeatureReleaseInput = {
  /** The data of the release. */
  data?: InputMaybe<AppFeatureReleaseDataInput>;
  /** The hosting type for the release. The app release category will be automatically determined based on this value. */
  kind?: InputMaybe<AppFeatureReleaseKind>;
};

/** The hosting type for the app feature release */
export enum AppFeatureReleaseKind {
  /** Client-side application deployed via monday.com CLI */
  ClientSideCode = 'CLIENT_SIDE_CODE',
  /** Externally hosted application loaded via iframe */
  ExternalHosting = 'EXTERNAL_HOSTING',
  /** Server-side application hosted on monday code infrastructure */
  ServerSideCode = 'SERVER_SIDE_CODE'
}

export type AppFeatureType = {
  __typename?: 'AppFeatureType';
  /** The app feature app id */
  app_id?: Maybe<Scalars['ID']['output']>;
  created_at?: Maybe<Scalars['Date']['output']>;
  /** The data of the app feature */
  data?: Maybe<Scalars['JSON']['output']>;
  /** The deployment information for the app feature */
  deployment?: Maybe<Scalars['JSON']['output']>;
  id: Scalars['ID']['output'];
  /** The name of the app feature */
  name?: Maybe<Scalars['String']['output']>;
  /** The type of the app feature */
  type?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['Date']['output']>;
};

/** The type of the app feature. */
export enum AppFeatureTypeE {
  /** ACCOUNT_SETTINGS_VIEW */
  AccountSettingsView = 'ACCOUNT_SETTINGS_VIEW',
  /** ADMIN_VIEW */
  AdminView = 'ADMIN_VIEW',
  /** AI */
  Ai = 'AI',
  /** AI_AGENT */
  AiAgent = 'AI_AGENT',
  /** AI_AGENT_SKILL */
  AiAgentSkill = 'AI_AGENT_SKILL',
  /** AI_BOARD_MAIN_MENU_HEADER */
  AiBoardMainMenuHeader = 'AI_BOARD_MAIN_MENU_HEADER',
  /** AI_DOC_CONTEXTUAL_MENU */
  AiDocContextualMenu = 'AI_DOC_CONTEXTUAL_MENU',
  /** AI_DOC_QUICK_START */
  AiDocQuickStart = 'AI_DOC_QUICK_START',
  /** AI_DOC_SLASH_COMMAND */
  AiDocSlashCommand = 'AI_DOC_SLASH_COMMAND',
  /** AI_DOC_TOP_BAR */
  AiDocTopBar = 'AI_DOC_TOP_BAR',
  /** AI_EMAILS_AND_ACTIVITIES_HEADER_ACTIONS */
  AiEmailsAndActivitiesHeaderActions = 'AI_EMAILS_AND_ACTIVITIES_HEADER_ACTIONS',
  /** AI_FORMULA */
  AiFormula = 'AI_FORMULA',
  /** AI_IC_ASSISTANT_HELP_CENTER */
  AiIcAssistantHelpCenter = 'AI_IC_ASSISTANT_HELP_CENTER',
  /** AI_ITEM_EMAILS_AND_ACTIVITIES_ACTIONS */
  AiItemEmailsAndActivitiesActions = 'AI_ITEM_EMAILS_AND_ACTIVITIES_ACTIONS',
  /** AI_ITEM_UPDATE_ACTIONS */
  AiItemUpdateActions = 'AI_ITEM_UPDATE_ACTIONS',
  /** APP_WIZARD */
  AppWizard = 'APP_WIZARD',
  /** BLOCK */
  Block = 'BLOCK',
  /** BOARD_COLUMN_ACTION */
  BoardColumnAction = 'BOARD_COLUMN_ACTION',
  /** BOARD_COLUMN_EXTENSION */
  BoardColumnExtension = 'BOARD_COLUMN_EXTENSION',
  /** BOARD_HEADER_ACTION */
  BoardHeaderAction = 'BOARD_HEADER_ACTION',
  /** BOARD_VIEW */
  BoardView = 'BOARD_VIEW',
  /** COLUMN */
  Column = 'COLUMN',
  /** COLUMN_TEMPLATE */
  ColumnTemplate = 'COLUMN_TEMPLATE',
  /** CREDENTIALS */
  Credentials = 'CREDENTIALS',
  /** DASHBOARD_WIDGET */
  DashboardWidget = 'DASHBOARD_WIDGET',
  /** DATA_ENTITY */
  DataEntity = 'DATA_ENTITY',
  /** DIALOG */
  Dialog = 'DIALOG',
  /** DIGITAL_WORKER */
  DigitalWorker = 'DIGITAL_WORKER',
  /** DOC_ACTIONS */
  DocActions = 'DOC_ACTIONS',
  /** FIELD_TYPE */
  FieldType = 'FIELD_TYPE',
  /** GROUP_MENU_ACTION */
  GroupMenuAction = 'GROUP_MENU_ACTION',
  /** GROWTH_CONFIG */
  GrowthConfig = 'GROWTH_CONFIG',
  /** INTEGRATION */
  Integration = 'INTEGRATION',
  /** ITEM_BATCH_ACTION */
  ItemBatchAction = 'ITEM_BATCH_ACTION',
  /** ITEM_MENU_ACTION */
  ItemMenuAction = 'ITEM_MENU_ACTION',
  /** ITEM_VIEW */
  ItemView = 'ITEM_VIEW',
  /** MODAL */
  Modal = 'MODAL',
  /** NOTIFICATION_KIND */
  NotificationKind = 'NOTIFICATION_KIND',
  /** NOTIFICATION_SETTING_KIND */
  NotificationSettingKind = 'NOTIFICATION_SETTING_KIND',
  /** OAUTH */
  Oauth = 'OAUTH',
  /** OBJECT */
  Object = 'OBJECT',
  /** PACKAGED_BLOCK */
  PackagedBlock = 'PACKAGED_BLOCK',
  /** PRODUCT */
  Product = 'PRODUCT',
  /** PRODUCT_VIEW */
  ProductView = 'PRODUCT_VIEW',
  /** SOLUTION */
  Solution = 'SOLUTION',
  /** SUB_WORKFLOW */
  SubWorkflow = 'SUB_WORKFLOW',
  /** SURFACE_VIEW */
  SurfaceView = 'SURFACE_VIEW',
  /** SYNCABLE_RESOURCE */
  SyncableResource = 'SYNCABLE_RESOURCE',
  /** TOPBAR */
  Topbar = 'TOPBAR',
  /** WORKFLOW_TEMPLATE */
  WorkflowTemplate = 'WORKFLOW_TEMPLATE',
  /** WORKSPACE_VIEW */
  WorkspaceView = 'WORKSPACE_VIEW'
}

/** An app install details. */
export type AppInstall = {
  __typename?: 'AppInstall';
  /** The app's unique identifier. */
  app_id: Scalars['ID']['output'];
  /** An app installer's account details. */
  app_install_account: AppInstallAccount;
  /** An app installer's user details */
  app_install_user: AppInstallUser;
  /** The app's version details */
  app_version?: Maybe<AppVersion>;
  /** The required and approved scopes for an app install. */
  permissions?: Maybe<AppInstallPermissions>;
  /** Installation date */
  timestamp?: Maybe<Scalars['String']['output']>;
};

/** An app installer's account details */
export type AppInstallAccount = {
  __typename?: 'AppInstallAccount';
  /** The app's installer account id. */
  id: Scalars['ID']['output'];
};

/** The required and approved scopes for an app install. */
export type AppInstallPermissions = {
  __typename?: 'AppInstallPermissions';
  /** The scopes approved by the account admin */
  approved_scopes: Array<Scalars['String']['output']>;
  /** The scopes required by the latest live version */
  required_scopes: Array<Scalars['String']['output']>;
};

/** An app installer's user details */
export type AppInstallUser = {
  __typename?: 'AppInstallUser';
  /** The app's installer user id. */
  id?: Maybe<Scalars['ID']['output']>;
};

/** The visibility type of an app */
export enum AppKind {
  /** App is private and only visible to the account that created it */
  Private = 'PRIVATE',
  /** App is public and can be shared and installed by other accounts */
  Public = 'PUBLIC'
}

/** The app monetization status for the current account */
export type AppMonetizationStatus = {
  __typename?: 'AppMonetizationStatus';
  /** Is apps monetization is supported for the account */
  is_supported: Scalars['Boolean']['output'];
};

/** The current state of an app based on its version status */
export enum AppStatus {
  /** App is in draft state and not yet published */
  Draft = 'DRAFT',
  /** App has a live published version */
  Live = 'LIVE'
}

/** The account subscription details for the app. */
export type AppSubscription = {
  __typename?: 'AppSubscription';
  /** The type of the billing period [monthly/yearly]. */
  billing_period?: Maybe<Scalars['String']['output']>;
  /** The number of days left until the subscription ends. */
  days_left?: Maybe<Scalars['Int']['output']>;
  /** Is the subscription a trial */
  is_trial?: Maybe<Scalars['Boolean']['output']>;
  /** Maximum number of units for current subscription plan. */
  max_units?: Maybe<Scalars['Int']['output']>;
  /** The subscription plan id (on the app's side). */
  plan_id: Scalars['String']['output'];
  /** The pricing version of subscription plan. */
  pricing_version?: Maybe<Scalars['Int']['output']>;
  /** The subscription renewal date. */
  renewal_date: Scalars['Date']['output'];
};

/** Subscription object */
export type AppSubscriptionDetails = {
  __typename?: 'AppSubscriptionDetails';
  /** The ID of an account */
  account_id: Scalars['Int']['output'];
  /** The currency, in which the product was purchased */
  currency: Scalars['String']['output'];
  /** The number of days left until the subscription ends */
  days_left: Scalars['Int']['output'];
  discounts: Array<SubscriptionDiscount>;
  /** The date the the inactive subscription ended. Equals to null for active subscriptions */
  end_date?: Maybe<Scalars['String']['output']>;
  /** The monthly price of the product purchased in the given currency, after applying discounts */
  monthly_price: Scalars['Float']['output'];
  period_type: SubscriptionPeriodType;
  /** The ID of a pricing plan */
  plan_id: Scalars['String']['output'];
  /** The ID of a pricing version */
  pricing_version_id: Scalars['Int']['output'];
  /** The date the active subscription is set to renew. Equals to null for inactive subscriptions */
  renewal_date?: Maybe<Scalars['String']['output']>;
  status: SubscriptionStatus;
};

/** The Operations counter response for the app action. */
export type AppSubscriptionOperationsCounter = {
  __typename?: 'AppSubscriptionOperationsCounter';
  /** The account subscription details for the app. */
  app_subscription?: Maybe<AppSubscription>;
  /** The new counter value. */
  counter_value?: Maybe<Scalars['Int']['output']>;
  /** Operations name. */
  kind: Scalars['String']['output'];
  /** Window key. */
  period_key?: Maybe<Scalars['String']['output']>;
};

export type AppSubscriptions = {
  __typename?: 'AppSubscriptions';
  /** The value, which identifies the exact point to continue fetching the subscriptions from */
  cursor?: Maybe<Scalars['String']['output']>;
  subscriptions: Array<AppSubscriptionDetails>;
  /** Total number of subscriptions matching the given parameters */
  total_count: Scalars['Int']['output'];
};

export type AppType = {
  __typename?: 'AppType';
  /** The app account ID */
  account_id?: Maybe<Scalars['ID']['output']>;
  /** The API app ID */
  api_app_id?: Maybe<Scalars['ID']['output']>;
  /** The API app ID */
  client_id?: Maybe<Scalars['String']['output']>;
  /** The app collaborators */
  collaborators?: Maybe<Array<User>>;
  created_at?: Maybe<Scalars['Date']['output']>;
  /** The user who created the app */
  created_by?: Maybe<Scalars['ID']['output']>;
  /** The description of the app */
  description?: Maybe<Scalars['String']['output']>;
  /** The apps' features */
  features?: Maybe<Array<AppFeatureType>>;
  id: Scalars['ID']['output'];
  /** The app kind */
  kind?: Maybe<AppKind>;
  /** The app name */
  name?: Maybe<Scalars['String']['output']>;
  /** The array of permission scopes */
  permissions?: Maybe<Array<Scalars['String']['output']>>;
  /** The app photo URL */
  photo_url?: Maybe<Scalars['String']['output']>;
  /** The app photo URL for small size */
  photo_url_small?: Maybe<Scalars['String']['output']>;
  /** The URL-friendly identifier */
  slug?: Maybe<Scalars['String']['output']>;
  /** The app status (i.e. is live?) */
  status?: Maybe<AppStatus>;
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The latest version type */
  version_type?: Maybe<Scalars['String']['output']>;
  /** The webhook endpoint URL */
  webhook_url?: Maybe<Scalars['String']['output']>;
};


export type AppTypeFeaturesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  live_version_only?: InputMaybe<Scalars['Boolean']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};

/** An app's version details. */
export type AppVersion = {
  __typename?: 'AppVersion';
  /** The app's major version. */
  major: Scalars['Int']['output'];
  /** The app's minor version. */
  minor: Scalars['Int']['output'];
  /** The app's patch version. */
  patch: Scalars['Int']['output'];
  /** The app's version text */
  text: Scalars['String']['output'];
  /** The app's version type. */
  type?: Maybe<Scalars['String']['output']>;
};

/** The app monetization information for the current account */
export type AppsMonetizationInfo = {
  __typename?: 'AppsMonetizationInfo';
  /**
   * The number of seats in the account, across all products, used to match the
   * app’s subscription among apps that utilize the seats-based monetization method
   */
  seats_count?: Maybe<Scalars['Int']['output']>;
};

/** The content blocks that make up the article. */
export type ArticleBlock = {
  __typename?: 'ArticleBlock';
  /** The block's content. */
  content?: Maybe<Scalars['JSON']['output']>;
  /** The block's creation date. */
  created_at?: Maybe<Scalars['String']['output']>;
  /** The block's creator */
  created_by?: Maybe<User>;
  /** The block's unique identifier. */
  id?: Maybe<Scalars['ID']['output']>;
  /** The block's parent block unique identifier. Will be null if the block is at the top level of the article. */
  parent_block_id?: Maybe<Scalars['ID']['output']>;
  /** The block's position on the article. */
  position?: Maybe<Scalars['Float']['output']>;
  /** The unique identifier of the published article that contains this block. */
  published_article_id?: Maybe<Scalars['ID']['output']>;
  /** The block content type. */
  type?: Maybe<Scalars['String']['output']>;
  /** The block's last updated date. */
  updated_at?: Maybe<Scalars['String']['output']>;
};

/** A file uploaded to monday.com */
export type Asset = {
  __typename?: 'Asset';
  /** The file's creation date. */
  created_at?: Maybe<Scalars['Date']['output']>;
  /** The file's extension. */
  file_extension: Scalars['String']['output'];
  /** The file's size in bytes. */
  file_size: Scalars['Int']['output'];
  /** The file's unique identifier. */
  id: Scalars['ID']['output'];
  /** The file's name. */
  name: Scalars['String']['output'];
  /** original geometry of the asset. */
  original_geometry?: Maybe<Scalars['String']['output']>;
  /** public url to the asset, valid for 1 hour. */
  public_url: Scalars['String']['output'];
  /** The user who uploaded the file. */
  uploaded_by: User;
  /** url to view the asset. */
  url: Scalars['String']['output'];
  /** url to view the asset in thumbnail mode. Only available for images. */
  url_thumbnail?: Maybe<Scalars['String']['output']>;
};

/** The source of the asset */
export enum AssetsSource {
  /** Assets from file columns and item's files gallery */
  All = 'all',
  /** Assets only from file columns */
  Columns = 'columns',
  /** Assets only from item's files gallery */
  Gallery = 'gallery'
}

/** Error that occurred while changing team owners. */
export type AssignTeamOwnersError = {
  __typename?: 'AssignTeamOwnersError';
  /** The error code. */
  code?: Maybe<AssignTeamOwnersErrorCode>;
  /** The error message. */
  message?: Maybe<Scalars['String']['output']>;
  /** The id of the user that caused the error. */
  user_id?: Maybe<Scalars['ID']['output']>;
};

/** Error codes that can occur while changing team owners. */
export enum AssignTeamOwnersErrorCode {
  CannotUpdateSelf = 'CANNOT_UPDATE_SELF',
  ExceedsBatchLimit = 'EXCEEDS_BATCH_LIMIT',
  Failed = 'FAILED',
  InvalidInput = 'INVALID_INPUT',
  UserNotFound = 'USER_NOT_FOUND',
  UserNotMemberOfTeam = 'USER_NOT_MEMBER_OF_TEAM',
  ViewersOrGuests = 'VIEWERS_OR_GUESTS'
}

/** Result of changing the team's ownership. */
export type AssignTeamOwnersResult = {
  __typename?: 'AssignTeamOwnersResult';
  /** Errors that occurred while changing team owners. */
  errors?: Maybe<Array<AssignTeamOwnersError>>;
  /** The team for which the owners were changed. */
  team?: Maybe<Team>;
};

/** Assignee filter for search queries */
export type AssigneeInput = {
  /** List of person IDs to filter by */
  personIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** List of team IDs to filter by */
  teamIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Text formatting attributes (bold, italic, links, colors, etc.) */
export type Attributes = {
  __typename?: 'Attributes';
  /** Background color for text highlighting (hex, rgb, or named color) */
  background?: Maybe<Scalars['String']['output']>;
  /** Apply bold formatting to the text */
  bold?: Maybe<Scalars['Boolean']['output']>;
  /** Apply inline code formatting to the text */
  code?: Maybe<Scalars['Boolean']['output']>;
  /** Text color (hex, rgb, or named color) */
  color?: Maybe<Scalars['String']['output']>;
  /** Apply italic formatting to the text */
  italic?: Maybe<Scalars['Boolean']['output']>;
  /** URL to create a hyperlink */
  link?: Maybe<Scalars['String']['output']>;
  /** Apply strikethrough formatting to the text */
  strike?: Maybe<Scalars['Boolean']['output']>;
  /** Apply underline formatting to the text */
  underline?: Maybe<Scalars['Boolean']['output']>;
};

/** Text formatting attributes (bold, italic, links, colors, etc.) */
export type AttributesInput = {
  /** Background color for text highlighting (hex, rgb, or named color) */
  background?: InputMaybe<Scalars['String']['input']>;
  /** Apply bold formatting to the text */
  bold?: InputMaybe<Scalars['Boolean']['input']>;
  /** Apply inline code formatting to the text */
  code?: InputMaybe<Scalars['Boolean']['input']>;
  /** Text color (hex, rgb, or named color) */
  color?: InputMaybe<Scalars['String']['input']>;
  /** Apply italic formatting to the text */
  italic?: InputMaybe<Scalars['Boolean']['input']>;
  /** URL to create a hyperlink */
  link?: InputMaybe<Scalars['String']['input']>;
  /** Apply strikethrough formatting to the text */
  strike?: InputMaybe<Scalars['Boolean']['input']>;
  /** Apply underline formatting to the text */
  underline?: InputMaybe<Scalars['Boolean']['input']>;
};

export type AuditEventCatalogueEntry = {
  __typename?: 'AuditEventCatalogueEntry';
  description?: Maybe<Scalars['String']['output']>;
  metadata_details?: Maybe<Scalars['JSON']['output']>;
  name?: Maybe<Scalars['String']['output']>;
};

export type AuditLogEntry = {
  __typename?: 'AuditLogEntry';
  account_id?: Maybe<Scalars['String']['output']>;
  activity_metadata?: Maybe<Scalars['JSON']['output']>;
  client_name?: Maybe<Scalars['String']['output']>;
  client_version?: Maybe<Scalars['String']['output']>;
  device_name?: Maybe<Scalars['String']['output']>;
  device_type?: Maybe<Scalars['String']['output']>;
  event?: Maybe<Scalars['String']['output']>;
  ip_address?: Maybe<Scalars['String']['output']>;
  os_name?: Maybe<Scalars['String']['output']>;
  os_version?: Maybe<Scalars['String']['output']>;
  slug?: Maybe<Scalars['String']['output']>;
  timestamp?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
  user_agent?: Maybe<Scalars['String']['output']>;
};

/**
 * A paginated collection of audit log entries. This object contains two properties:
 *   logs, the requested page of AuditLogEntry objects matching your query, and pagination, which
 *   contains metadata about the current and next page (if present).
 */
export type AuditLogPage = {
  __typename?: 'AuditLogPage';
  /**
   * List of audit log entries for the current page. See the audit log entry object
   *       for more details on this object.
   */
  logs?: Maybe<Array<AuditLogEntry>>;
  /** Pagination metadata. See the pagination object for more details. */
  pagination?: Maybe<Pagination>;
};

/** The role of the user. */
export enum BaseRoleName {
  Admin = 'ADMIN',
  Guest = 'GUEST',
  Member = 'MEMBER',
  ViewOnly = 'VIEW_ONLY'
}

/** Result of an batch operation */
export type BatchExtendTrialPeriod = {
  __typename?: 'BatchExtendTrialPeriod';
  /** Details of operations */
  details?: Maybe<Array<ExtendTrialPeriod>>;
  /** Reason of an error */
  reason?: Maybe<Scalars['String']['output']>;
  /** Result of a batch operation */
  success: Scalars['Boolean']['output'];
};

/** A value showing status distribution counts */
export type BatteryValue = ColumnValue & {
  __typename?: 'BatteryValue';
  /** The battery value for this item */
  battery_value: Array<BatteryValueItem>;
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** Text representation of the column value. Note: Not all columns support textual value */
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** A battery value item representing a status count */
export type BatteryValueItem = {
  __typename?: 'BatteryValueItem';
  /** The count for this status */
  count: Scalars['Int']['output'];
  /** The status index key */
  key: Scalars['ID']['output'];
};

/** Alignment options for blocks */
export enum BlockAlignment {
  Center = 'CENTER',
  Left = 'LEFT',
  Right = 'RIGHT'
}

/** Abstract union type representing different types of block content */
export type BlockContent = DividerContent | ImageContent | LayoutContent | ListBlockContent | NoticeBoxContent | PageBreakContent | TableContent | TextBlockContent | VideoContent;

/** Text direction options for blocks */
export enum BlockDirection {
  Ltr = 'LTR',
  Rtl = 'RTL'
}

/** Automation block execution event */
export type BlockEvent = {
  __typename?: 'BlockEvent';
  /** Account identifier */
  accountId?: Maybe<Scalars['Int']['output']>;
  /** Atomic action identifier */
  atomicActionId?: Maybe<Scalars['String']['output']>;
  /** Number of billing actions counted in this block */
  billingActionCountForBlock?: Maybe<Scalars['Int']['output']>;
  /** Timestamp (epoch) when block finished */
  blockFinishTimestamp?: Maybe<Scalars['Float']['output']>;
  /** Timestamp (epoch) when block started */
  blockStartTimestamp?: Maybe<Scalars['Float']['output']>;
  /** Board identifier */
  boardId?: Maybe<Scalars['Int']['output']>;
  /** Whether block condition was satisfied */
  conditionSatisfied?: Maybe<Scalars['Boolean']['output']>;
  /** Entity kind for the block */
  entityKind?: Maybe<Scalars['String']['output']>;
  /** Error reason if block failed */
  errorReason?: Maybe<Scalars['String']['output']>;
  /** Kind of the block event */
  eventKind?: Maybe<Scalars['String']['output']>;
  /** Current state of the block event */
  eventState?: Maybe<Scalars['String']['output']>;
  /** Document identifier */
  id?: Maybe<Scalars['String']['output']>;
  /** Block title */
  title?: Maybe<Scalars['String']['output']>;
  /** Timestamp (epoch) when parent trigger started */
  triggerStarted?: Maybe<Scalars['Float']['output']>;
  /** Date when parent trigger started */
  triggerStartedAt?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** UUID of the parent trigger event */
  triggerUuid?: Maybe<Scalars['String']['output']>;
  /** User identifier who triggered the automation */
  userId?: Maybe<Scalars['Int']['output']>;
  /** Workflow node identifier */
  workflowNodeId?: Maybe<Scalars['Int']['output']>;
};

/** A page of block events */
export type BlockEventsPage = {
  __typename?: 'BlockEventsPage';
  /** List of block events in the current page */
  blockEvents?: Maybe<Array<BlockEvent>>;
};

/** Object representing structured data within a text block */
export type BlotContent = DocsColumnValue | Mention;

/** Object representing structured data within a text block */
export type BlotInput = {
  /** Column value blot data */
  column_value?: InputMaybe<DocsColumnValueInput>;
  /** Mention blot data */
  mention?: InputMaybe<MentionInput>;
};

/** A monday.com board. */
export type Board = {
  __typename?: 'Board';
  /** The user's permission level for this board (view / edit). */
  access_level: BoardAccessLevel;
  /** The board log events. */
  activity_logs?: Maybe<Array<Maybe<ActivityLogType>>>;
  /** The board's folder unique identifier. */
  board_folder_id?: Maybe<Scalars['ID']['output']>;
  /** The board's kind (public / private / share). */
  board_kind: BoardKind;
  /** The board's visible columns. */
  columns?: Maybe<Array<Maybe<Column>>>;
  /** The board's columns namespace. */
  columns_namespace?: Maybe<Scalars['String']['output']>;
  /** Get the board communication value - typically meeting ID */
  communication?: Maybe<Scalars['JSON']['output']>;
  /** The time the board was created at. */
  created_at?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** The creator of the board. */
  creator: User;
  /** The board's description. */
  description?: Maybe<Scalars['String']['output']>;
  /** The board's visible groups. */
  groups?: Maybe<Array<Maybe<Group>>>;
  /** The hierarchy type of the board */
  hierarchy_type?: Maybe<BoardHierarchy>;
  /** The unique identifier of the board. */
  id: Scalars['ID']['output'];
  /** The Board's item nickname, one of a predefined set of values, or a custom user value */
  item_terminology?: Maybe<Scalars['String']['output']>;
  /** The number of items on the board */
  items_count?: Maybe<Scalars['Int']['output']>;
  /** The maximum number of items this board can have */
  items_limit?: Maybe<Scalars['Int']['output']>;
  /** The board's items (rows). */
  items_page: ItemsResponse;
  /** The board's name. */
  name: Scalars['String']['output'];
  /** The Board's object type unique key */
  object_type_unique_key?: Maybe<Scalars['String']['output']>;
  /**
   * The owner of the board.
   * @deprecated This field returned creator of the board. Please use 'creator' or 'owners' fields instead.
   */
  owner: User;
  /** List of user board owners */
  owners: Array<Maybe<User>>;
  /** The board's permissions. */
  permissions: Scalars['String']['output'];
  /** The board's state (all / active / archived / deleted). */
  state: State;
  /** The board's subscribers. */
  subscribers: Array<Maybe<User>>;
  /** The board's specific tags. */
  tags?: Maybe<Array<Maybe<Tag>>>;
  /** List of team board owners */
  team_owners?: Maybe<Array<Team>>;
  /** The board's team subscribers. */
  team_subscribers?: Maybe<Array<Team>>;
  /** The top group at this board. */
  top_group: Group;
  /** The board object type. */
  type?: Maybe<BoardObjectType>;
  /** The last time the board was updated at. */
  updated_at?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** The board's updates. */
  updates?: Maybe<Array<Update>>;
  /** The Board's url */
  url: Scalars['String']['output'];
  /** The board's views. */
  views?: Maybe<Array<Maybe<BoardView>>>;
  /** The workspace that contains this board (null for main workspace). */
  workspace?: Maybe<Workspace>;
  /** The board's workspace unique identifier (null for main workspace). */
  workspace_id?: Maybe<Scalars['ID']['output']>;
};


/** A monday.com board. */
export type BoardActivity_LogsArgs = {
  column_ids?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  from?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
  group_ids?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  item_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  to?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
  user_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};


/** A monday.com board. */
export type BoardColumnsArgs = {
  capabilities?: InputMaybe<Array<ColumnCapability>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  types?: InputMaybe<Array<ColumnType>>;
};


/** A monday.com board. */
export type BoardGroupsArgs = {
  ids?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


/** A monday.com board. */
export type BoardItems_PageArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  hierarchy_scope_config?: InputMaybe<Scalars['String']['input']>;
  limit?: Scalars['Int']['input'];
  query_params?: InputMaybe<ItemsQuery>;
};


/** A monday.com board. */
export type BoardTeam_OwnersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};


/** A monday.com board. */
export type BoardTeam_SubscribersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};


/** A monday.com board. */
export type BoardUpdatesArgs = {
  board_updates_only?: InputMaybe<Scalars['Boolean']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};


/** A monday.com board. */
export type BoardViewsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  type?: InputMaybe<Scalars['String']['input']>;
};

/** The board access level of the user */
export enum BoardAccessLevel {
  /** Edit contents */
  Edit = 'edit',
  /** View */
  View = 'view'
}

/** The board attributes available. */
export enum BoardAttributes {
  /** Object that contains available Video conferences on the board. */
  Communication = 'communication',
  /** Board description. */
  Description = 'description',
  /** Board name. */
  Name = 'name'
}

/** Basic role names for board permissions. Each role grants different levels of access to the board. */
export enum BoardBasicRoleName {
  /**
   * Assigned Contributor role - Can edit content (items) only, and only for items
   * where they are assigned in the specified assignee columns (Coming soon - not
   * yet supported, please use the UI instead)
   */
  AssignedContributor = 'assigned_contributor',
  /** Contributor role - Can edit content (items) only, but not the structure (columns, groups) of the board */
  Contributor = 'contributor',
  /** Editor role - Can edit both the structure (columns, groups) and content (items) of the board */
  Editor = 'editor',
  /** Viewer role - Read-only access to the board, cannot edit structure or content */
  Viewer = 'viewer'
}

/** A board duplication */
export type BoardDuplication = {
  __typename?: 'BoardDuplication';
  /** The new board created by the duplication */
  board: Board;
  /** Was the board duplication performed asynchronously */
  is_async: Scalars['Boolean']['output'];
};

/** Edit permissions level for boards. */
export enum BoardEditPermissions {
  /** Assignee */
  Assignee = 'assignee',
  /** Collaborators */
  Collaborators = 'collaborators',
  /** Everyone */
  Everyone = 'everyone',
  /** Owners */
  Owners = 'owners'
}

/** The complete graph export for a board */
export type BoardGraphExport = {
  __typename?: 'BoardGraphExport';
  /** The ID of the board */
  boardId?: Maybe<Scalars['String']['output']>;
  /** The total number of edges in the graph */
  edgeCount?: Maybe<Scalars['Int']['output']>;
  /** The timestamp when the graph was exported */
  exportedAt?: Maybe<Scalars['String']['output']>;
  /** The graph data structure */
  graphData?: Maybe<Scalars['JSON']['output']>;
  /** The total number of nodes in the graph */
  nodeCount?: Maybe<Scalars['Int']['output']>;
};

/** The board hierarchy type */
export enum BoardHierarchy {
  /** classic */
  Classic = 'classic',
  /** multilevel of items */
  MultiLevel = 'multi_level'
}

/** The board kinds available. */
export enum BoardKind {
  /** Private boards. */
  Private = 'private',
  /** Public boards. */
  Public = 'public',
  /** Shareable boards. */
  Share = 'share'
}

export type BoardMuteSettings = {
  __typename?: 'BoardMuteSettings';
  /** Board ID */
  board_id?: Maybe<Scalars['ID']['output']>;
  /** List of enabled customizable settings when the board is in CUSTOM_SETTINGS mute state. Null otherwise. */
  enabled?: Maybe<Array<CustomizableBoardSettings>>;
  /** Human-friendly mute state for the board and current user */
  mute_state?: Maybe<BoardMuteState>;
};

/**
 * Represents the mute state of a board for the current user.
 *
 *   - NOT_MUTED: The board is not muted at all (default state). This state, as well as MUTE_ALL, is set by the board owner(s) and only they can change it.
 *   - MUTE_ALL: All notifications for all users are muted on this board. This state, as well as NOT_MUTED, is set by the board owner(s) and only they can change it.
 *   - MENTIONS_AND_ASSIGNS_ONLY: The current user will only be notified if mentioned or assigned on the board.
 *   - CUSTOM_SETTINGS: The current user will only be notified for the enabled custom settings. configurable settings: IM_MENTIONED, IM_ASSIGNED, AUTOMATION_NOTIFY
 *   - CURRENT_USER_MUTE_ALL: Only the current user has all notifications muted from this board.
 */
export enum BoardMuteState {
  /** Only the current user has all notifications muted from this board */
  CurrentUserMuteAll = 'CURRENT_USER_MUTE_ALL',
  /** The current user will only be notified for the enabled custom settings. configurable settings: IM_MENTIONED, IM_ASSIGNED, AUTOMATION_NOTIFY */
  CustomSettings = 'CUSTOM_SETTINGS',
  /** The current user will only be notified if mentioned or assigned on the board */
  MentionsAndAssignsOnly = 'MENTIONS_AND_ASSIGNS_ONLY',
  /** All notifications for all users are muted on this board. This state is set by the board owner(s) and only they can change it. */
  MuteAll = 'MUTE_ALL',
  /** The board is not muted at all (default state). This state is set by the board owner(s) and only they can change it. */
  NotMuted = 'NOT_MUTED'
}

/** The board object types. */
export enum BoardObjectType {
  /** Parent Board. */
  Board = 'board',
  /** Custom Object. */
  CustomObject = 'custom_object',
  /** Document. */
  Document = 'document',
  /** Sub Items Board. */
  SubItemsBoard = 'sub_items_board'
}

export type BoardRelationValue = ColumnValue & {
  __typename?: 'BoardRelationValue';
  /** The column that this value belongs to. */
  column: Column;
  /** A string representing all the names of the linked items, separated by commas */
  display_value: Scalars['String']['output'];
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** The linked items IDs */
  linked_item_ids: Array<Scalars['ID']['output']>;
  /** The linked items. */
  linked_items: Array<Item>;
  /** Text representation of the column value. Note: Not all columns support textual value */
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** The board subscriber kind. */
export enum BoardSubscriberKind {
  /** Board owner. */
  Owner = 'owner',
  /** Board subscriber. */
  Subscriber = 'subscriber'
}

/** Enum representing different usage types for board operations */
export enum BoardUsage {
  /** Board can be connected to a portfolio */
  ConnectToPortfolio = 'CONNECT_TO_PORTFOLIO',
  /** Board can be converted to a project */
  ConvertToProject = 'CONVERT_TO_PROJECT'
}

/** A board's view. */
export type BoardView = {
  __typename?: 'BoardView';
  /** The view's access level */
  access_level: BoardViewAccessLevel;
  /** The view's filter */
  filter?: Maybe<Scalars['JSON']['output']>;
  /** The view's filter team id */
  filter_team_id?: Maybe<Scalars['Int']['output']>;
  /** The view's filter user id */
  filter_user_id?: Maybe<Scalars['Int']['output']>;
  /** The view's unique identifier. */
  id: Scalars['ID']['output'];
  /** The view's name. */
  name: Scalars['String']['output'];
  /** The view's settings, the structure varies by view type */
  settings?: Maybe<Scalars['JSON']['output']>;
  /** The view's settings in a string form. */
  settings_str: Scalars['String']['output'];
  /** The view's sort */
  sort?: Maybe<Scalars['JSON']['output']>;
  /** The view's template id if it was duplicated from other view */
  source_view_id?: Maybe<Scalars['ID']['output']>;
  /** The view's tags */
  tags?: Maybe<Array<Scalars['String']['output']>>;
  /** The view's type. */
  type?: Maybe<Scalars['String']['output']>;
  /** Specific board view data (supported only for forms) */
  view_specific_data_str: Scalars['String']['output'];
};

/** The board view access level of the user */
export enum BoardViewAccessLevel {
  /** Edit */
  Edit = 'edit',
  /** View */
  View = 'view'
}

/** Options to order by. */
export enum BoardsOrderBy {
  /** The rank order of the board creation time (desc). */
  CreatedAt = 'created_at',
  /** The last time the user making the request used the board (desc). */
  UsedAt = 'used_at'
}

/** Boost configuration for search results. Key-value pairs where key is strategy type and value is boost weight. */
export type BoostConfigurationInput = {
  /** Boost strategies as key-value pairs (strategy: weight). Empty object {} disables all boosts. */
  boosts?: InputMaybe<Scalars['JSON']['input']>;
};

/** Reason for failure when status is Rejected or Failed */
export enum BulkImportFailureReason {
  /** The authorization failed. */
  AuthorizationFailed = 'AUTHORIZATION_FAILED',
  /** The board capacity exceeded. */
  BoardCapacityExceeded = 'BOARD_CAPACITY_EXCEEDED',
  /** An internal error occurred. */
  InternalError = 'INTERNAL_ERROR',
  /** The upload is invalid. */
  InvalidUpload = 'INVALID_UPLOAD',
  /** The permission was denied. */
  PermissionDenied = 'PERMISSION_DENIED'
}

/** Initialization response for bulk import containing import ID and upload URL */
export type BulkImportInit = {
  __typename?: 'BulkImportInit';
  /** The unique identifier of the bulk import operation */
  import_id?: Maybe<Scalars['ID']['output']>;
  /** The URL where the file should be uploaded for processing */
  upload_url?: Maybe<Scalars['String']['output']>;
};

/** Item counts for a bulk import process */
export type BulkImportItemCounts = {
  __typename?: 'BulkImportItemCounts';
  /** Number of items that have been created */
  created?: Maybe<Scalars['Int']['output']>;
  /** Number of valid items that failed during import execution */
  failed?: Maybe<Scalars['Int']['output']>;
  /** Number of items that failed validation */
  invalid?: Maybe<Scalars['Int']['output']>;
  /** Number of items that were skipped */
  skipped?: Maybe<Scalars['Int']['output']>;
  /** Total number of items submitted for import */
  submitted?: Maybe<Scalars['Int']['output']>;
  /** Number of items that have been updated */
  updated?: Maybe<Scalars['Int']['output']>;
};

/** Current state of the import process */
export enum BulkImportState {
  /** The import is completed. */
  Completed = 'COMPLETED',
  /** The import is failed. */
  Failed = 'FAILED',
  /** The import is processing. */
  Processing = 'PROCESSING',
  /** The import is rejected. */
  Rejected = 'REJECTED',
  /** The upload is pending. */
  UploadPending = 'UPLOAD_PENDING'
}

/** Status information for a bulk import process */
export type BulkImportStatus = {
  __typename?: 'BulkImportStatus';
  /** Item counts breakdown for the import process */
  counts?: Maybe<BulkImportItemCounts>;
  /** Reason for failure when status is Rejected or Failed */
  failure_reason?: Maybe<BulkImportFailureReason>;
  /** Indicates if the upload is completely done */
  fully_imported?: Maybe<Scalars['Boolean']['output']>;
  /** Progress percentage (0-100) of the import process */
  progress_percentage?: Maybe<Scalars['Int']['output']>;
  /** Indicates if a report file has been generated */
  report_created?: Maybe<Scalars['Boolean']['output']>;
  /** URL to download the import report, valid for 10 minutes */
  report_url?: Maybe<Scalars['String']['output']>;
  /** Current state of the import process */
  status?: Maybe<BulkImportState>;
};

export type ButtonValue = ColumnValue & {
  __typename?: 'ButtonValue';
  /** The button's color in hex value. */
  color?: Maybe<Scalars['String']['output']>;
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** The button's label. */
  label?: Maybe<Scalars['String']['output']>;
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** Calculated capability settings for a column */
export type CalculatedCapability = {
  __typename?: 'CalculatedCapability';
  /** Type of the calculated value */
  calculated_type?: Maybe<ColumnType>;
  /** Function to calculate the parent values */
  function: CalculatedFunction;
};

/** Input for configuring calculated capability settings on a column */
export type CalculatedCapabilityInput = {
  /** Function to calculate the values. If not provided, will use the default function for the column type. */
  function: CalculatedFunction;
};

/** Available functions for calculating values in column capabilities */
export enum CalculatedFunction {
  /** Count the number of labels */
  CountKeys = 'COUNT_KEYS',
  /** Calculate the maximum value */
  Max = 'MAX',
  /** Calculate the minimum value */
  Min = 'MIN',
  /** Calculate both minimum and maximum values for time ranges */
  MinMax = 'MIN_MAX',
  /** No calculation */
  None = 'NONE',
  /** Calculate the sum of all values */
  Sum = 'SUM'
}

/** A cell containing a reference to a block */
export type Cell = {
  __typename?: 'Cell';
  /** The ID of the block representing the cell (parent block of all the content blocks in the cell) */
  block_id: Scalars['String']['output'];
};

/** The result of adding users to / removing users from a team. */
export type ChangeTeamMembershipsResult = {
  __typename?: 'ChangeTeamMembershipsResult';
  /** The users that team membership update failed for */
  failed_users?: Maybe<Array<User>>;
  /** The users that team membership update succeeded for */
  successful_users?: Maybe<Array<User>>;
};

/** Whether this channel is editable, always enabled, or not relevant to the notification */
export enum ChannelEditableStatus {
  AllRelatedNotificationsDontHaveChannel = 'AllRelatedNotificationsDontHaveChannel',
  AlwaysEnabled = 'AlwaysEnabled',
  Editable = 'Editable'
}

/** Available notification channel types: Monday, Email, Slack */
export enum ChannelType {
  Email = 'Email',
  Monday = 'Monday',
  Slack = 'Slack'
}

export type CheckboxValue = ColumnValue & {
  __typename?: 'CheckboxValue';
  /** The column's boolean value. */
  checked?: Maybe<Scalars['Boolean']['output']>;
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  value?: Maybe<Scalars['JSON']['output']>;
};

export type ColorPickerValue = ColumnValue & {
  __typename?: 'ColorPickerValue';
  /** The color in hex value. */
  color?: Maybe<Scalars['String']['output']>;
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

export type Column = {
  __typename?: 'Column';
  /** Is the column archived or not. */
  archived: Scalars['Boolean']['output'];
  /** Capabilities available for this column */
  capabilities: ColumnCapabilities;
  /** The column's description. */
  description?: Maybe<Scalars['String']['output']>;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** The revision of the column (fetch to get latest revision). Used for optimistic concurrency control. */
  revision: Scalars['String']['output'];
  /** The column's settings in a JSON form. */
  settings?: Maybe<Scalars['JSON']['output']>;
  /**
   * The column's settings in a string form.
   * @deprecated From version 2025-10, use settings instead. Will be removed in a future version.
   */
  settings_str: Scalars['String']['output'];
  /** The column's title. */
  title: Scalars['String']['output'];
  /** The column's type. */
  type: ColumnType;
  /** The column's width. */
  width?: Maybe<Scalars['Int']['output']>;
};

/** Capabilities available for a column */
export type ColumnCapabilities = {
  __typename?: 'ColumnCapabilities';
  /** Calculated capability settings */
  calculated?: Maybe<CalculatedCapability>;
};

/** Input for configuring column capabilities during creation */
export type ColumnCapabilitiesInput = {
  /** Calculated capability settings. If provided, enables calculated functionality for the column. */
  calculated?: InputMaybe<CalculatedCapabilityInput>;
};

/** Capabilities supported by the API */
export enum ColumnCapability {
  /** Capability to show column's calculated value */
  Calculated = 'CALCULATED'
}

/** An object defining a mapping of column between source board and destination board */
export type ColumnMappingInput = {
  /** The source column's unique identifier. */
  source: Scalars['ID']['input'];
  /** The target column's unique identifier. */
  target?: InputMaybe<Scalars['ID']['input']>;
};

/** The property name of the column to be changed. */
export enum ColumnProperty {
  /** the column description. */
  Description = 'description',
  /** the column title. */
  Title = 'title'
}

export type ColumnPropertyInput = {
  /** The ID of the column */
  column_id: Scalars['String']['input'];
  /** Whether the column is visible */
  visible: Scalars['Boolean']['input'];
};

export type ColumnSettings = DropdownColumnSettings | StatusColumnSettings;

/** Column style configuration */
export type ColumnStyle = {
  __typename?: 'ColumnStyle';
  /** The width percentage of the column */
  width: Scalars['Int']['output'];
};

/** Column style configuration input */
export type ColumnStyleInput = {
  /** The width percentage of the column */
  width: Scalars['Int']['input'];
};

/** Types of columns supported by the API */
export enum ColumnType {
  /** Number items according to their order in the group/board */
  AutoNumber = 'auto_number',
  /** Connect data from other boards */
  BoardRelation = 'board_relation',
  /** Perform actions on items by clicking a button */
  Button = 'button',
  /** Check off items and see what's done at a glance */
  Checkbox = 'checkbox',
  /** Manage a design system using a color palette */
  ColorPicker = 'color_picker',
  /** Choose a country */
  Country = 'country',
  /** Add the item's creator and creation date automatically */
  CreationLog = 'creation_log',
  /** Add dates like deadlines to ensure you never drop the ball */
  Date = 'date',
  /** Set up dependencies between items in the board */
  Dependency = 'dependency',
  /** Document your work and increase collaboration */
  DirectDoc = 'direct_doc',
  /** Document your work and increase collaboration */
  Doc = 'doc',
  /** Create a dropdown list of options */
  Dropdown = 'dropdown',
  /** Email team members and clients directly from your board */
  Email = 'email',
  /** Add files & docs to your item */
  File = 'file',
  /** Use functions to manipulate data across multiple columns */
  Formula = 'formula',
  Group = 'group',
  /** Add times to manage and schedule tasks, shifts and more */
  Hour = 'hour',
  /** Integration is really cool... */
  Integration = 'integration',
  /** Show all item's assignees */
  ItemAssignees = 'item_assignees',
  /** Show a unique ID for each item */
  ItemId = 'item_id',
  /** Add the person that last updated the item and the date */
  LastUpdated = 'last_updated',
  /** Simply hyperlink to any website */
  Link = 'link',
  /** Place multiple locations on a geographic map */
  Location = 'location',
  /** Add large amounts of text without changing column width */
  LongText = 'long_text',
  /** Show and edit columns' data from connected boards */
  Mirror = 'mirror',
  /** Name is really cool... */
  Name = 'name',
  /** Add revenue, costs, time estimations and more */
  Numbers = 'numbers',
  /** Assign people to improve team work */
  People = 'people',
  /** Assign a person to increase ownership and accountability (deprecated) */
  Person = 'person',
  /** Call your contacts directly from monday.com */
  Phone = 'phone',
  /** Show progress by combining status columns in a battery */
  Progress = 'progress',
  /** Rate or rank anything visually */
  Rating = 'rating',
  /** Get an instant overview of where things stand */
  Status = 'status',
  /** Use the subtasks column to create another level of tasks */
  Subtasks = 'subtasks',
  /** Add tags to categorize items across multiple boards */
  Tags = 'tags',
  /** Assign a full team to an item  */
  Team = 'team',
  /** Add textual information e.g. addresses, names or keywords */
  Text = 'text',
  /** Easily track time spent on each item, group, and board */
  TimeTracking = 'time_tracking',
  /** Visualize your item’s duration, with a start and end date */
  Timeline = 'timeline',
  /** Unsupported column type */
  Unsupported = 'unsupported',
  /** Vote on an item e.g. pick a new feature or a favorite lunch place */
  Vote = 'vote',
  /** Select the week on which each item should be completed */
  Week = 'week',
  /** Keep track of the time anywhere in the world */
  WorldClock = 'world_clock'
}

export type ColumnValue = {
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** Text representation of the column value. Note: Not all columns support textual value */
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

export type ColumnsConfigInput = {
  /** Order of columns */
  column_order?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Configuration for main board columns */
  column_properties?: InputMaybe<Array<ColumnPropertyInput>>;
  /** Number of floating columns to display */
  floating_columns_count?: InputMaybe<Scalars['Int']['input']>;
  /** Configuration for subitems columns */
  subitems_column_properties?: InputMaybe<Array<ColumnPropertyInput>>;
};

export type ColumnsMappingInput = {
  project_owner: Scalars['ID']['input'];
  project_status: Scalars['ID']['input'];
  project_timeline: Scalars['ID']['input'];
};

/** Complexity data. */
export type Complexity = {
  __typename?: 'Complexity';
  /** The remainder of complexity after the query's execution. */
  after: Scalars['Int']['output'];
  /** The remainder of complexity before the query's execution. */
  before: Scalars['Int']['output'];
  /** The specific query's complexity. */
  query: Scalars['Int']['output'];
  /** How long in seconds before the complexity budget is reset */
  reset_in_x_seconds: Scalars['Int']['output'];
};

export type ConnectProjectResult = {
  __typename?: 'ConnectProjectResult';
  /** A message describing the result of the operation. */
  message?: Maybe<Scalars['String']['output']>;
  /** The ID of the created portfolio item, if successful. */
  portfolio_item_id?: Maybe<Scalars['String']['output']>;
  /** Indicates if the operation was successful. */
  success?: Maybe<Scalars['Boolean']['output']>;
};

/** Represents an integration connection between a monday.com account and an external service. */
export type Connection = {
  __typename?: 'Connection';
  /** Identifier of the monday.com account that owns the connection. */
  accountId?: Maybe<Scalars['Int']['output']>;
  /** ISO timestamp when the connection was created. */
  createdAt?: Maybe<Scalars['String']['output']>;
  /** Unique identifier of the connection. */
  id?: Maybe<Scalars['Int']['output']>;
  /** Authentication method used by the connection (e.g., oauth, token_based). */
  method?: Maybe<Scalars['String']['output']>;
  /** Human-readable display name for the connection. */
  name?: Maybe<Scalars['String']['output']>;
  /** External service provider of the connection (e.g., gmail, slack). */
  provider?: Maybe<Scalars['String']['output']>;
  /** Identifier of the linked account at the provider side. */
  providerAccountIdentifier?: Maybe<Scalars['String']['output']>;
  /** Current state of the connection (e.g., active, inactive). */
  state?: Maybe<Scalars['String']['output']>;
  /** ISO timestamp when the connection was last updated. */
  updatedAt?: Maybe<Scalars['String']['output']>;
  /** Identifier of the user who created the connection. */
  userId?: Maybe<Scalars['Int']['output']>;
};

export type ConvertBoardToProjectInput = {
  board_id: Scalars['ID']['input'];
  callback_url?: InputMaybe<Scalars['String']['input']>;
  column_mappings: ColumnsMappingInput;
};

export type ConvertBoardToProjectResult = {
  __typename?: 'ConvertBoardToProjectResult';
  message?: Maybe<Scalars['String']['output']>;
  process_id?: Maybe<Scalars['String']['output']>;
  projectId?: Maybe<Scalars['ID']['output']>;
  success?: Maybe<Scalars['Boolean']['output']>;
};

export type Country = {
  __typename?: 'Country';
  /** The country's two-letter code. */
  code: Scalars['String']['output'];
  /** The country's name. */
  name: Scalars['String']['output'];
};

export type CountryValue = ColumnValue & {
  __typename?: 'CountryValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The country value. */
  country?: Maybe<Country>;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** Text representation of the column value. Note: Not all columns support textual value */
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** Input for creating an app with its configuration data. */
export type CreateAppInput = {
  /** Array of user IDs with access */
  collaborators?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Detailed description of the app */
  description?: InputMaybe<Scalars['String']['input']>;
  /** App visibility type */
  kind?: InputMaybe<AppKind>;
  /** The display name of the app */
  name: Scalars['String']['input'];
  /** Array of permission scopes */
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
  /** URL-friendly identifier */
  slug?: InputMaybe<Scalars['String']['input']>;
  /** Webhook endpoint URL */
  webhook_url?: InputMaybe<Scalars['String']['input']>;
};

/**
 *   Choose one specific block type to create.
 *
 * 💡 TIP: Before using table_block, consider add_content_to_doc_from_markdown for tables with data.
 *
 * table_block creates empty structure requiring manual cell population.
 */
export type CreateBlockInput = {
  /** Create a divider block */
  divider_block?: InputMaybe<DividerBlockInput>;
  /** Create an image block */
  image_block?: InputMaybe<ImageBlockInput>;
  /** Create a layout block. Capture its returned ID; nest child blocks by setting parentBlockId to that ID and use afterBlockId for sibling ordering. */
  layout_block?: InputMaybe<LayoutBlockInput>;
  /** Create a list block (bulleted, numbered, checklist) */
  list_block?: InputMaybe<ListBlockInput>;
  /** The notice-box's own ID must be captured.  Every block that should appear inside it must be created with parentBlockId = that ID (and can still use afterBlockId for ordering among siblings). */
  notice_box_block?: InputMaybe<NoticeBoxBlockInput>;
  /** Create a page break block */
  page_break_block?: InputMaybe<PageBreakBlockInput>;
  /** Create a table block. Capture its returned ID; nest child blocks by setting parentBlockId to that ID and use afterBlockId for sibling ordering. */
  table_block?: InputMaybe<TableBlockInput>;
  /** Create a text block (normal text, titles) */
  text_block?: InputMaybe<TextBlockInput>;
  /** Create a video block */
  video_block?: InputMaybe<VideoBlockInput>;
};

export type CreateDocBoardInput = {
  /** Column id */
  column_id: Scalars['String']['input'];
  /** Item id */
  item_id: Scalars['ID']['input'];
};

export type CreateDocInput = {
  board?: InputMaybe<CreateDocBoardInput>;
  workspace?: InputMaybe<CreateDocWorkspaceInput>;
};

export type CreateDocWorkspaceInput = {
  /** Optional board folder id */
  folder_id?: InputMaybe<Scalars['ID']['input']>;
  /** The doc's kind (public / private / share) */
  kind?: InputMaybe<BoardKind>;
  /** The doc's name */
  name: Scalars['String']['input'];
  /** Workspace id */
  workspace_id: Scalars['ID']['input'];
};

export type CreateDropdownColumnSettingsInput = {
  /** Maximum number of labels that can be selected when limit_select is enabled */
  label_limit_count?: InputMaybe<Scalars['Int']['input']>;
  labels: Array<CreateDropdownLabelInput>;
  /** Whether to limit the number of labels that can be selected */
  limit_select?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CreateDropdownLabelInput = {
  label: Scalars['String']['input'];
};

/** Input type for adding an object to a hierarchy list */
export type CreateFavoriteInput = {
  /** The name of the object */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The position where to add the object */
  newPosition?: InputMaybe<ObjectDynamicPositionInput>;
  /** The object to add to the list */
  object: HierarchyObjectIdInputType;
};

/** Represents the response when adding an object to a list */
export type CreateFavoriteResultType = {
  __typename?: 'CreateFavoriteResultType';
  /** The favorite item that was created */
  favorite?: Maybe<GraphqlHierarchyObjectItem>;
  /** If the object that was created is a folder, this is extra data about the folder */
  folder?: Maybe<GraphqlFolder>;
};

export type CreateFormTagInput = {
  /** The name of the tag. Must be unique within the form and not reserved. */
  name: Scalars['String']['input'];
  /** The value of the tag */
  value?: InputMaybe<Scalars['String']['input']>;
};

export type CreatePortfolioResult = {
  __typename?: 'CreatePortfolioResult';
  /** A message describing the result of the operation. */
  message?: Maybe<Scalars['String']['output']>;
  /** The ID of the solution that was created */
  solution_live_version_id?: Maybe<Scalars['String']['output']>;
  /** Indicates if the operation was successful. */
  success?: Maybe<Scalars['Boolean']['output']>;
};

export type CreateQuestionInput = {
  /** Optional explanatory text providing additional context, instructions, or examples for the question. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Array of option objects for choice-based questions (single_select, multi_select). Required for select types. */
  options?: InputMaybe<Array<QuestionOptionInput>>;
  /** Boolean indicating if the question must be answered before form submission. */
  required?: InputMaybe<Scalars['Boolean']['input']>;
  /** Question-specific configuration object that varies by question type. */
  settings?: InputMaybe<FormQuestionSettingsInput>;
  /** The question text displayed to respondents. Must be at least 1 character long and clearly indicate the expected response. */
  title: Scalars['String']['input'];
  /** The question type determining input behavior and validation (e.g., "text", "email", "single_select", "multi_select"). */
  type: FormQuestionType;
  /** Boolean controlling question visibility to respondents. Hidden questions remain in form structure but are not displayed. */
  visible?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CreateStatusColumnSettingsInput = {
  labels: Array<CreateStatusLabelInput>;
};

export type CreateStatusLabelInput = {
  color: StatusColumnColors;
  description?: InputMaybe<Scalars['String']['input']>;
  index: Scalars['Int']['input'];
  is_done?: InputMaybe<Scalars['Boolean']['input']>;
  label: Scalars['String']['input'];
};

/** Attributes of the team to be created. */
export type CreateTeamAttributesInput = {
  /** Whether the team can contain guest users. */
  is_guest_team?: InputMaybe<Scalars['Boolean']['input']>;
  /** The team's name. */
  name: Scalars['String']['input'];
  /** The parent team identifier. */
  parent_team_id?: InputMaybe<Scalars['ID']['input']>;
  /** The team members. Must not be empty, unless allow_empty_team is set. */
  subscriber_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Options for creating a team. */
export type CreateTeamOptionsInput = {
  /** Whether to allow a team without any subscribers. */
  allow_empty_team?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CreationLogValue = ColumnValue & {
  __typename?: 'CreationLogValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The date when the item was created. */
  created_at: Scalars['Date']['output'];
  /** User who created the item */
  creator: User;
  /** ID of the user who created the item */
  creator_id: Scalars['ID']['output'];
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

export type CustomActivity = {
  __typename?: 'CustomActivity';
  color?: Maybe<CustomActivityColor>;
  icon_id?: Maybe<CustomActivityIcon>;
  id?: Maybe<Scalars['ID']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
};

export enum CustomActivityColor {
  BrinkPink = 'BRINK_PINK',
  CelticBlue = 'CELTIC_BLUE',
  CornflowerBlue = 'CORNFLOWER_BLUE',
  DingyDungeon = 'DINGY_DUNGEON',
  GoGreen = 'GO_GREEN',
  Gray = 'GRAY',
  LightDeepPink = 'LIGHT_DEEP_PINK',
  LightHotPink = 'LIGHT_HOT_PINK',
  MayaBlue = 'MAYA_BLUE',
  MediumTurquoise = 'MEDIUM_TURQUOISE',
  ParadisePink = 'PARADISE_PINK',
  PhilippineGreen = 'PHILIPPINE_GREEN',
  PhilippineYellow = 'PHILIPPINE_YELLOW',
  SlateBlue = 'SLATE_BLUE',
  VividCerulean = 'VIVID_CERULEAN',
  YankeesBlue = 'YANKEES_BLUE',
  YellowGreen = 'YELLOW_GREEN',
  YellowOrange = 'YELLOW_ORANGE'
}

export enum CustomActivityIcon {
  Ascending = 'ASCENDING',
  Camera = 'CAMERA',
  Conference = 'CONFERENCE',
  Flag = 'FLAG',
  Gift = 'GIFT',
  Headphones = 'HEADPHONES',
  Homekeys = 'HOMEKEYS',
  Location = 'LOCATION',
  Notebook = 'NOTEBOOK',
  Paperplane = 'PAPERPLANE',
  Plane = 'PLANE',
  Pliers = 'PLIERS',
  Tripod = 'TRIPOD',
  Twoflags = 'TWOFLAGS',
  Utencils = 'UTENCILS'
}

/** The custom fields meta data for user profile. */
export type CustomFieldMetas = {
  __typename?: 'CustomFieldMetas';
  /** The custom field meta's description. */
  description?: Maybe<Scalars['String']['output']>;
  /** Is the custom field meta editable or not. */
  editable?: Maybe<Scalars['Boolean']['output']>;
  /** The custom field meta's type. */
  field_type?: Maybe<Scalars['String']['output']>;
  /** Is the custom field meta flagged or not. */
  flagged?: Maybe<Scalars['Boolean']['output']>;
  /** The custom field meta's icon. */
  icon?: Maybe<Scalars['String']['output']>;
  /** The custom field meta's unique identifier. */
  id?: Maybe<Scalars['String']['output']>;
  /** The custom field meta's position in the user profile page. */
  position?: Maybe<Scalars['String']['output']>;
  /** The custom field meta's title. */
  title?: Maybe<Scalars['String']['output']>;
};

/** A custom field value for user profile. */
export type CustomFieldValue = {
  __typename?: 'CustomFieldValue';
  /** The custom field value's meta unique identifier. */
  custom_field_meta_id?: Maybe<Scalars['String']['output']>;
  /** The custom field value. */
  value?: Maybe<Scalars['String']['output']>;
};

/** These settings can be customized when the board is in CUSTOM_SETTINGS mute state. Configurable settings: IM_MENTIONED, IM_ASSIGNED, AUTOMATION_NOTIFY */
export enum CustomizableBoardSettings {
  /** Notify me on automation notify step on this board */
  AutomationNotify = 'AUTOMATION_NOTIFY',
  /** Notify me when I am assigned on this board */
  ImAssigned = 'IM_ASSIGNED',
  /** Notify me when I am mentioned on this board */
  ImMentioned = 'IM_MENTIONED'
}

/** API usage data. */
export type DailyAnalytics = {
  __typename?: 'DailyAnalytics';
  /** API usage per app. */
  by_app?: Maybe<Array<PlatformApiDailyAnalyticsByApp>>;
  /** API usage per day. */
  by_day?: Maybe<Array<PlatformApiDailyAnalyticsByDay>>;
  /** API usage per user. */
  by_user?: Maybe<Array<PlatformApiDailyAnalyticsByUser>>;
  /** Last time the API usage data was updated. */
  last_updated?: Maybe<Scalars['ISO8601DateTime']['output']>;
};

/** Platform API daily limit. */
export type DailyLimit = {
  __typename?: 'DailyLimit';
  /** Base daily limit. */
  base?: Maybe<Scalars['Int']['output']>;
  /** Total daily limit. */
  total?: Maybe<Scalars['Int']['output']>;
};

/** Aggregates data from one or more boards. */
export type Dashboard = {
  __typename?: 'Dashboard';
  /** Folder ID that groups elements inside the workspace (null = workspace root). */
  board_folder_id?: Maybe<Scalars['ID']['output']>;
  /** Unique identifier of the dashboard. */
  id?: Maybe<Scalars['ID']['output']>;
  /** Visibility level: `PUBLIC` (default) or `PRIVATE`. */
  kind?: Maybe<DashboardKind>;
  /** Dashboard title (UTF-8 chars). */
  name?: Maybe<Scalars['String']['output']>;
  /** ID of the workspace that owns this dashboard. */
  workspace_id?: Maybe<Scalars['ID']['output']>;
};

/** Dashboard visibility. `PUBLIC` dashboards are visible to all workspace members; `PRIVATE` dashboards are only visible to invited users. */
export enum DashboardKind {
  Private = 'PRIVATE',
  Public = 'PUBLIC'
}

/** Date range filter (inclusive) */
export type DateRangeInput = {
  /** End date (ISO 8601) */
  endDate: Scalars['String']['input'];
  /** Start date (ISO 8601) */
  startDate: Scalars['String']['input'];
};

export type DateValue = ColumnValue & {
  __typename?: 'DateValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The column's date value. */
  date?: Maybe<Scalars['String']['output']>;
  /** The string representation of selected icon. */
  icon?: Maybe<Scalars['String']['output']>;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** The formatted date and time in user time zone. */
  text?: Maybe<Scalars['String']['output']>;
  /** The column's time value. */
  time?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** Error that occurred during deactivation. */
export type DeactivateUsersError = {
  __typename?: 'DeactivateUsersError';
  /** The error code. */
  code?: Maybe<DeactivateUsersErrorCode>;
  /** The error message. */
  message?: Maybe<Scalars['String']['output']>;
  /** The id of the user that caused the error. */
  user_id?: Maybe<Scalars['ID']['output']>;
};

/** Error codes for deactivating users. */
export enum DeactivateUsersErrorCode {
  CannotUpdateSelf = 'CANNOT_UPDATE_SELF',
  ExceedsBatchLimit = 'EXCEEDS_BATCH_LIMIT',
  Failed = 'FAILED',
  InvalidInput = 'INVALID_INPUT',
  UserNotFound = 'USER_NOT_FOUND'
}

/** Result of deactivating users. */
export type DeactivateUsersResult = {
  __typename?: 'DeactivateUsersResult';
  /** The users that were deactivated. */
  deactivated_users?: Maybe<Array<User>>;
  /** Errors that occurred during deactivation. */
  errors?: Maybe<Array<DeactivateUsersError>>;
};

export type DehydratedFormResponse = {
  __typename?: 'DehydratedFormResponse';
  /** The board ID connected to the form. Used to store form responses as items. */
  boardId: Scalars['ID']['output'];
  /** The unique identifier token for the form. Required for all form-specific operations. */
  token: Scalars['String']['output'];
};

/** Input type for removing an object from favorites */
export type DeleteFavoriteInput = {
  /** The object to remove from favorites */
  object: HierarchyObjectIdInputType;
};

/** Result type for removing an object from favorites */
export type DeleteFavoriteInputResultType = {
  __typename?: 'DeleteFavoriteInputResultType';
  /** Whether the object was successfully removed */
  success?: Maybe<Scalars['Boolean']['output']>;
};

export type DeleteFormTagInput = {
  /** Options for deleting the tag */
  deleteAssociatedColumn?: InputMaybe<Scalars['Boolean']['input']>;
};

export type DeleteMarketplaceAppDiscount = {
  __typename?: 'DeleteMarketplaceAppDiscount';
  /** Slug of an account */
  account_slug: Scalars['String']['output'];
  /** The id of an app */
  app_id: Scalars['ID']['output'];
};

export type DeleteMarketplaceAppDiscountResult = {
  __typename?: 'DeleteMarketplaceAppDiscountResult';
  deleted_discount: DeleteMarketplaceAppDiscount;
};

/** Type of dependency relationship between items */
export enum DependencyRelation {
  /** Finish to Finish - The dependent item can finish only after the predecessor finishes */
  Ff = 'FF',
  /** Finish to Start - The dependent item can start only after the predecessor finishes */
  Fs = 'FS',
  /** Start to Start - The dependent item can start only after the predecessor starts */
  Sf = 'SF',
  /** Start to Finish - The dependent item can finish only after the predecessor starts */
  Ss = 'SS'
}

export type DependencyValue = ColumnValue & {
  __typename?: 'DependencyValue';
  /** The column that this value belongs to. */
  column: Column;
  /** A string representing all the names of the linked items, separated by commas */
  display_value: Scalars['String']['output'];
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** The linked items ids */
  linked_item_ids: Array<Scalars['ID']['output']>;
  /** The linked items. */
  linked_items: Array<Item>;
  /** Text representation of the column value. Note: Not all columns support textual value */
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** Input type for updating dependency column value, supporting both adding and removing dependencies */
export type DependencyValueInput = {
  /** List of pulses to add as dependencies with their configuration */
  added_pulse?: InputMaybe<Array<UpdateDependencyColumnInput>>;
  /** List of pulses to remove from dependencies */
  removed_pulse?: InputMaybe<Array<UpdateDependencyColumnInput>>;
};

export type DirectDocValue = ColumnValue & {
  __typename?: 'DirectDocValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The document file attached to the column. */
  file?: Maybe<DirectDocValue>;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** Text representation of the column value. Note: Not all columns support textual value */
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** The period of a discount */
export enum DiscountPeriod {
  Monthly = 'MONTHLY',
  Yearly = 'YEARLY'
}

/** Input for creating divider blocks */
export type DividerBlockInput = {
  /** The parent block id to append the created block under. */
  parent_block_id?: InputMaybe<Scalars['String']['input']>;
};

/** Content for a divider block */
export type DividerContent = DocBaseBlockContent & {
  __typename?: 'DividerContent';
  /** The alignment of the block content */
  alignment?: Maybe<BlockAlignment>;
  /** The text direction of the block content */
  direction?: Maybe<BlockDirection>;
};

/** Base interface for all block content types */
export type DocBaseBlockContent = {
  /** The alignment of the block content */
  alignment?: Maybe<BlockAlignment>;
  /** The text direction of the block content */
  direction?: Maybe<BlockDirection>;
};

/** Various documents blocks types, such as text. */
export enum DocBlockContentType {
  /** Bulleted list block */
  BulletedList = 'bulleted_list',
  /** Check list block */
  CheckList = 'check_list',
  /** Code block */
  Code = 'code',
  /** Divider block */
  Divider = 'divider',
  /** Image block */
  Image = 'image',
  /** Large title block */
  LargeTitle = 'large_title',
  /** Layout block */
  Layout = 'layout',
  /** Medium title block */
  MediumTitle = 'medium_title',
  /** Simple text block */
  NormalText = 'normal_text',
  /** Notice block */
  NoticeBox = 'notice_box',
  /** Numbered list block */
  NumberedList = 'numbered_list',
  /** Page break block */
  PageBreak = 'page_break',
  /** Quote text block */
  Quote = 'quote',
  /** Small title block */
  SmallTitle = 'small_title',
  /** Table block */
  Table = 'table',
  /** Video block */
  Video = 'video'
}

/** Response from adding markdown content to a document. Contains success status and the IDs of newly created blocks. */
export type DocBlocksFromMarkdownResult = {
  __typename?: 'DocBlocksFromMarkdownResult';
  /** Array of block IDs that were created from the markdown content. Use these IDs to reference or modify the newly created blocks. */
  block_ids?: Maybe<Array<Scalars['String']['output']>>;
  /** Detailed error message if the operation failed. Check this when success is false. */
  error?: Maybe<Scalars['String']['output']>;
  /** True if markdown was successfully converted and added to the document */
  success: Scalars['Boolean']['output'];
};

/** The kind/type of document access level */
export enum DocKind {
  /** Private document */
  Private = 'private',
  /** Public document */
  Public = 'public',
  /** Shareable document */
  Share = 'share'
}

export type DocValue = ColumnValue & {
  __typename?: 'DocValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The document file attached to the column. */
  file?: Maybe<FileDocValue>;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** Text representation of the column value. Note: Not all columns support textual value */
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** Column value reference for displaying board item column data */
export type DocsColumnValue = {
  __typename?: 'DocsColumnValue';
  /** The ID of the column */
  column_id?: Maybe<Scalars['String']['output']>;
  /** The ID of the board item */
  item_id?: Maybe<Scalars['Int']['output']>;
};

/** Column value reference for displaying board item column data */
export type DocsColumnValueInput = {
  /** The ID of the column */
  column_id: Scalars['String']['input'];
  /** The ID of the board item */
  item_id: Scalars['Int']['input'];
};

/** Type of mention - user, document, or board */
export enum DocsMention {
  /** Mention of a board */
  Board = 'BOARD',
  /** Mention of a document */
  Doc = 'DOC',
  /** Mention of a user */
  User = 'USER'
}

/** Options to order by. */
export enum DocsOrderBy {
  /** The rank order of the document creation time (desc). */
  CreatedAt = 'created_at',
  /** The last time the user making the request viewd the document (desc). */
  UsedAt = 'used_at'
}

/**
 * Represents a monday.com doc - a rich-text page built from editable blocks (text, files, embeds, etc.).
 *   A doc can belong to:
 *   (1) a workspace (left-pane doc),
 *   (2) an item (doc on column),
 *   (3) a board view (doc as a board view).
 */
export type Document = {
  __typename?: 'Document';
  /** The document's content blocks */
  blocks?: Maybe<Array<Maybe<DocumentBlock>>>;
  /** The document's creation date. */
  created_at?: Maybe<Scalars['Date']['output']>;
  /** The document's creator */
  created_by?: Maybe<User>;
  /** The document's folder unique identifier (null for first level). */
  doc_folder_id?: Maybe<Scalars['ID']['output']>;
  /** The document's kind (public / private / share). */
  doc_kind: BoardKind;
  /**
   * Unique document ID returned when the doc is created.
   *   Use this ID in every API call that references the doc.
   *   How to find it:
   *   • Call the docs() GraphQL query with object_ids to map object_id → id
   *   • Enable 'Developer Mode' in monday.labs to display it inside the doc.
   */
  id: Scalars['ID']['output'];
  /** The document's name. */
  name: Scalars['String']['output'];
  /**
   * Identifier that appears in the doc's URL.
   *   Returned on creation, but DO NOT use it in API routes that expect a document ID.
   */
  object_id: Scalars['ID']['output'];
  /** The document's relative url */
  relative_url?: Maybe<Scalars['String']['output']>;
  /** The document's settings. */
  settings?: Maybe<Scalars['JSON']['output']>;
  /** The document's direct url */
  url?: Maybe<Scalars['String']['output']>;
  /** The workspace that contains this document (null for main workspace). */
  workspace?: Maybe<Workspace>;
  /** The document's workspace unique identifier (null for main workspace). */
  workspace_id?: Maybe<Scalars['ID']['output']>;
};


/**
 * Represents a monday.com doc - a rich-text page built from editable blocks (text, files, embeds, etc.).
 *   A doc can belong to:
 *   (1) a workspace (left-pane doc),
 *   (2) an item (doc on column),
 *   (3) a board view (doc as a board view).
 */
export type DocumentBlocksArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};

/** A monday.com document block. */
export type DocumentBlock = {
  __typename?: 'DocumentBlock';
  /** The block's content. */
  content?: Maybe<Scalars['JSON']['output']>;
  /** The block's creation date. */
  created_at?: Maybe<Scalars['Date']['output']>;
  /** The block's creator */
  created_by?: Maybe<User>;
  /** The block's document unique identifier. */
  doc_id?: Maybe<Scalars['ID']['output']>;
  /** The block's unique identifier. */
  id: Scalars['String']['output'];
  /** The block's parent block unique identifier. */
  parent_block_id?: Maybe<Scalars['String']['output']>;
  /** The block's position on the document. */
  position?: Maybe<Scalars['Float']['output']>;
  /** The block content type. */
  type?: Maybe<Scalars['String']['output']>;
  /** The block's last updated date. */
  updated_at?: Maybe<Scalars['Date']['output']>;
};

/** A monday.com doc block. */
export type DocumentBlockIdOnly = {
  __typename?: 'DocumentBlockIdOnly';
  /** The block's unique identifier. */
  id: Scalars['String']['output'];
};

/** Represents a content block — the fundamental building unit of a monday.com document. Each block encapsulates its structured content, hierarchical relationships, and associated metadata. */
export type DocumentBlockV2 = {
  __typename?: 'DocumentBlockV2';
  /** The block's content as an array of structured content blocks. */
  content: Array<Maybe<BlockContent>>;
  /** The block's creation date. */
  created_at?: Maybe<Scalars['String']['output']>;
  /** The block's creator. */
  created_by?: Maybe<User>;
  /** The block's document unique identifier. */
  doc_id?: Maybe<Scalars['ID']['output']>;
  /** The block's unique identifier. */
  id: Scalars['ID']['output'];
  /** The block's parent block unique identifier. Used for nesting (e.g., content inside table cells, layout columns, or notice boxes). Null for top-level blocks. */
  parent_block_id?: Maybe<Scalars['String']['output']>;
  /** The block's position on the document (auto-generated). Higher numbers appear later in document. Use afterBlockId in mutations to control ordering. */
  position?: Maybe<Scalars['Float']['output']>;
  /** The block content type. */
  type?: Maybe<Scalars['String']['output']>;
  /** The block's last updated date. */
  updated_at?: Maybe<Scalars['String']['output']>;
};

export type DropdownColumnSettings = {
  __typename?: 'DropdownColumnSettings';
  labels?: Maybe<Array<DropdownLabel>>;
  type?: Maybe<ManagedColumnTypes>;
};

export type DropdownLabel = {
  __typename?: 'DropdownLabel';
  id?: Maybe<Scalars['Int']['output']>;
  is_deactivated?: Maybe<Scalars['Boolean']['output']>;
  label?: Maybe<Scalars['String']['output']>;
};

export type DropdownManagedColumn = {
  __typename?: 'DropdownManagedColumn';
  created_at?: Maybe<Scalars['Date']['output']>;
  created_by?: Maybe<Scalars['ID']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  revision?: Maybe<Scalars['Int']['output']>;
  settings?: Maybe<DropdownColumnSettings>;
  settings_json?: Maybe<Scalars['JSON']['output']>;
  state?: Maybe<ManagedColumnState>;
  title?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['Date']['output']>;
  updated_by?: Maybe<Scalars['ID']['output']>;
};

export type DropdownValue = ColumnValue & {
  __typename?: 'DropdownValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
  /** The selected dropdown values. */
  values: Array<DropdownValueOption>;
};

export type DropdownValueOption = {
  __typename?: 'DropdownValueOption';
  /** The dropdown item's unique identifier. */
  id: Scalars['ID']['output'];
  /** The dropdown item's label. */
  label: Scalars['String']['output'];
};

/** The board duplicate types available. */
export enum DuplicateBoardType {
  /** Duplicate board with structure and items. */
  DuplicateBoardWithPulses = 'duplicate_board_with_pulses',
  /** Duplicate board with structure, items and updates. */
  DuplicateBoardWithPulsesAndUpdates = 'duplicate_board_with_pulses_and_updates',
  /** Duplicate board with structure. */
  DuplicateBoardWithStructure = 'duplicate_board_with_structure'
}

/** Controls what gets copied when duplicating a document */
export enum DuplicateType {
  /** Creates a clean copy with only the document structure and content blocks. Best for creating templates or fresh copies. */
  DuplicateDocWithContent = 'duplicate_doc_with_content',
  /** Creates a complete copy including document structure, content blocks, and all comments/update history. Use for full backups. */
  DuplicateDocWithContentAndUpdates = 'duplicate_doc_with_content_and_updates'
}

export type DynamicPosition = {
  /**
   * A boolean flag indicating the desired position of the target item: set to true
   * to place the item after the reference object, or false to place it before.
   */
  is_after?: InputMaybe<Scalars['Boolean']['input']>;
  /** The unique identifier of the reference object relative to which the target item will be positioned. */
  object_id: Scalars['String']['input'];
  /**
   * The type or category of the reference object, used to determine how the target
   * item should be positioned in relation to it.
   */
  object_type: ObjectType;
};

export type EmailValue = ColumnValue & {
  __typename?: 'EmailValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The column's email value. */
  email?: Maybe<Scalars['String']['output']>;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** The column's text value. It can be the same as email when user didn't enter any text. */
  label?: Maybe<Scalars['String']['output']>;
  /** Text representation of the column value. Note: Not all columns support textual value */
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** Response from exporting document content as markdown. Contains the generated markdown text or error details. */
export type ExportMarkdownResult = {
  __typename?: 'ExportMarkdownResult';
  /** Detailed error message if the export failed. Check this when success is false. */
  error?: Maybe<Scalars['String']['output']>;
  /** The exported markdown content as a string. Ready to use in other systems or save to files. */
  markdown?: Maybe<Scalars['String']['output']>;
  /** True if document content was successfully exported as markdown */
  success: Scalars['Boolean']['output'];
};

/** Result of a single operation */
export type ExtendTrialPeriod = {
  __typename?: 'ExtendTrialPeriod';
  /** Account slug */
  account_slug: Scalars['String']['output'];
  /** Reason of an error */
  reason?: Maybe<Scalars['String']['output']>;
  /** Result of a single operation */
  success: Scalars['Boolean']['output'];
};

/** Widget types available for creating data visualizations and displays */
export enum ExternalWidget {
  /** Battery widgets for progress tracking and completion status visualization. Displays progress bars, completion percentages, status indicators, and goal achievement metrics. Perfect for showing project completion, task progress, capacity utilization, and milestone tracking. */
  Battery = 'BATTERY',
  /** Chart widgets for visual data representation including pie charts, bar charts, line graphs, and column charts. Used to display trends, comparisons, distributions, and relationships between data points over time or categories. */
  Chart = 'CHART',
  /** Number widgets for displaying numeric metrics such as accumulated sums, averages, counts, totals, percentages. Ideal for showing single-value metrics, counters, calculated aggregations, and key performance indicators in a prominent numeric format. */
  Number = 'NUMBER'
}

export type FileAssetValue = {
  __typename?: 'FileAssetValue';
  /** The asset associated with the file. */
  asset: Asset;
  /** The asset's id. */
  asset_id: Scalars['ID']['output'];
  /** The file's creation date. */
  created_at: Scalars['Date']['output'];
  /** The user who created the file. */
  creator?: Maybe<User>;
  /** The ID of user who created the file. */
  creator_id?: Maybe<Scalars['ID']['output']>;
  /** Whether the file is an image. */
  is_image: Scalars['Boolean']['output'];
  /** The file's name. */
  name: Scalars['String']['output'];
};

/** The type of a link value stored inside a file column */
export enum FileColumnValue {
  /** Asset file */
  Asset = 'asset',
  /** Box file */
  Box = 'box',
  /** Doc file */
  Doc = 'doc',
  /** Dropbox file */
  Dropbox = 'dropbox',
  /** Google Drive file */
  GoogleDrive = 'google_drive',
  /** Generic link file */
  Link = 'link',
  /** OneDrive file */
  Onedrive = 'onedrive'
}

export type FileDocValue = {
  __typename?: 'FileDocValue';
  /** The file's creation date. */
  created_at: Scalars['Date']['output'];
  /** The user who created the file. */
  creator?: Maybe<User>;
  /** The ID of user who created the file. */
  creator_id?: Maybe<Scalars['ID']['output']>;
  /** The doc associated with the file. */
  doc: Document;
  /** The file's unique identifier. */
  file_id: Scalars['ID']['output'];
  /** The associated board or object's unique identifier. */
  object_id: Scalars['ID']['output'];
  /** The file's url. */
  url?: Maybe<Scalars['String']['output']>;
};

export type FileInput = {
  /** The asset's id. */
  assetId?: InputMaybe<Scalars['ID']['input']>;
  /** File kind */
  fileType: FileColumnValue;
  /** File link */
  linkToFile?: InputMaybe<Scalars['String']['input']>;
  /** File display name */
  name: Scalars['String']['input'];
  /** The doc's id */
  objectId?: InputMaybe<Scalars['ID']['input']>;
};

export type FileLinkValue = {
  __typename?: 'FileLinkValue';
  /** The file's creation date. */
  created_at: Scalars['Date']['output'];
  /** The user who created the file. */
  creator?: Maybe<User>;
  /** The ID of user who created the file. */
  creator_id?: Maybe<Scalars['ID']['output']>;
  /** The file's id. */
  file_id: Scalars['ID']['output'];
  /** The file's kind. */
  kind: FileLinkValueKind;
  /** The file's name. */
  name: Scalars['String']['output'];
  /** The file's url. */
  url?: Maybe<Scalars['String']['output']>;
};

/** The type of a link value stored inside a file column */
export enum FileLinkValueKind {
  /** Box file */
  Box = 'box',
  /** Dropbox file */
  Dropbox = 'dropbox',
  /** Google Drive file */
  GoogleDrive = 'google_drive',
  /** Generic link file */
  Link = 'link',
  /** OneDrive file */
  Onedrive = 'onedrive'
}

export type FileValue = ColumnValue & {
  __typename?: 'FileValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The files attached to the column. */
  files: Array<FileValueItem>;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** A single file in a column. */
export type FileValueItem = FileAssetValue | FileDocValue | FileLinkValue;

/** The first day of work week */
export enum FirstDayOfTheWeek {
  /** Monday */
  Monday = 'monday',
  /** Sunday */
  Sunday = 'sunday'
}

/** A workspace folder containing boards, docs, sub folders, etc. */
export type Folder = {
  __typename?: 'Folder';
  /** The various items in the folder, not including sub-folders and dashboards. */
  children: Array<Maybe<Board>>;
  /** The folder's color. */
  color?: Maybe<FolderColor>;
  /** The folder's creation date. */
  created_at: Scalars['Date']['output'];
  /** The folder's custom icon. */
  custom_icon?: Maybe<FolderCustomIcon>;
  /** The folder's font weight. */
  font_weight?: Maybe<FolderFontWeight>;
  /** The folder's unique identifier. */
  id: Scalars['ID']['output'];
  /** The folder's name. */
  name: Scalars['String']['output'];
  /** The folder's user owner unique identifier. */
  owner_id?: Maybe<Scalars['ID']['output']>;
  /** The folder's parent folder. */
  parent?: Maybe<Folder>;
  /** Sub-folders inside this folder. */
  sub_folders: Array<Maybe<Folder>>;
  /** The workspace that contains this folder (null id for main workspace). */
  workspace: Workspace;
};

/** One value out of a list of valid folder colors */
export enum FolderColor {
  /** aquamarine */
  Aquamarine = 'AQUAMARINE',
  /** bright-blue */
  BrightBlue = 'BRIGHT_BLUE',
  /** bright-green */
  BrightGreen = 'BRIGHT_GREEN',
  /** chili-blue */
  ChiliBlue = 'CHILI_BLUE',
  /** dark-orange */
  DarkOrange = 'DARK_ORANGE',
  /** dark_purple */
  DarkPurple = 'DARK_PURPLE',
  /** dark-red */
  DarkRed = 'DARK_RED',
  /** done-green */
  DoneGreen = 'DONE_GREEN',
  /** indigo */
  Indigo = 'INDIGO',
  /** lipstick */
  Lipstick = 'LIPSTICK',
  /** No color */
  Null = 'NULL',
  /** purple */
  Purple = 'PURPLE',
  /** sofia_pink */
  SofiaPink = 'SOFIA_PINK',
  /** stuck-red */
  StuckRed = 'STUCK_RED',
  /** sunset */
  Sunset = 'SUNSET',
  /** working_orange */
  WorkingOrange = 'WORKING_ORANGE'
}

/** One value out of a list of valid folder custom icons */
export enum FolderCustomIcon {
  /** Folder */
  Folder = 'FOLDER',
  /** MoreBelow */
  Morebelow = 'MOREBELOW',
  /** MoreBelowFilled */
  Morebelowfilled = 'MOREBELOWFILLED',
  /** No custom icon */
  Null = 'NULL',
  /** Work */
  Work = 'WORK'
}

/** One value out of a list of valid folder font weights */
export enum FolderFontWeight {
  /** font-weight-bold */
  FontWeightBold = 'FONT_WEIGHT_BOLD',
  /** font-weight-light */
  FontWeightLight = 'FONT_WEIGHT_LIGHT',
  /** font-weight-normal */
  FontWeightNormal = 'FONT_WEIGHT_NORMAL',
  /** font-weight-very-light */
  FontWeightVeryLight = 'FONT_WEIGHT_VERY_LIGHT',
  /** No font weight */
  Null = 'NULL'
}

/** Object containing accessibility options such as language, alt text, etc. */
export type FormAccessibility = {
  __typename?: 'FormAccessibility';
  /** Language code for form localization and interface text (e.g., "en", "es", "fr"). */
  language?: Maybe<Scalars['String']['output']>;
  /** Alternative text description for the logo image for accessibility. */
  logoAltText?: Maybe<Scalars['String']['output']>;
};

/** Accessibility configuration including language and reading direction. */
export type FormAccessibilityInput = {
  /** Language code for form localization and interface text (e.g., "en", "es", "fr"). */
  language?: InputMaybe<Scalars['String']['input']>;
  /** Alternative text description for the logo image for accessibility. */
  logoAltText?: InputMaybe<Scalars['String']['input']>;
};

export type FormAfterSubmissionView = {
  __typename?: 'FormAfterSubmissionView';
  /** Boolean allowing users to modify their submitted responses after submission. */
  allowEditSubmission: Scalars['Boolean']['output'];
  /** Boolean allowing users to submit multiple responses to the same form. */
  allowResubmit: Scalars['Boolean']['output'];
  /** Boolean allowing users to view their submitted responses. */
  allowViewSubmission: Scalars['Boolean']['output'];
  /** Text shown to users after they complete the form. */
  description?: Maybe<Scalars['String']['output']>;
  /** Object containing redirect configuration after form submission. */
  redirectAfterSubmission?: Maybe<FormRedirectAfterSubmission>;
  /** Boolean displaying a success image after form completion. */
  showSuccessImage: Scalars['Boolean']['output'];
  /** Text displayed as the title after successful form submission. */
  title?: Maybe<Scalars['String']['output']>;
};

/** Object containing settings for the post-submission user experience. */
export type FormAfterSubmissionViewInput = {
  /** Boolean allowing users to modify their submitted responses after submission. */
  allowEditSubmission?: InputMaybe<Scalars['Boolean']['input']>;
  /** Boolean allowing users to submit multiple responses to the same form. */
  allowResubmit?: InputMaybe<Scalars['Boolean']['input']>;
  /** Boolean allowing users to view their submitted responses. */
  allowViewSubmission?: InputMaybe<Scalars['Boolean']['input']>;
  /** Text shown to users after they complete the form. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Object containing redirect configuration after form submission. */
  redirectAfterSubmission?: InputMaybe<FormRedirectAfterSubmissionInput>;
  /** Boolean displaying a success image after form completion. */
  showSuccessImage?: InputMaybe<Scalars['Boolean']['input']>;
  /** Text displayed as the title after successful form submission. */
  title?: InputMaybe<Scalars['String']['input']>;
};

export enum FormAlignment {
  Center = 'Center',
  FullLeft = 'FullLeft',
  FullRight = 'FullRight',
  Left = 'Left',
  Right = 'Right'
}

/** Object containing visual styling including colors, layout, fonts, and branding elements. */
export type FormAppearance = {
  __typename?: 'FormAppearance';
  /** Object containing background appearance configuration for the form. */
  background?: Maybe<FormBackground>;
  /** Boolean hiding monday branding from the form display. */
  hideBranding: Scalars['Boolean']['output'];
  /** Object containing form structure and presentation settings. */
  layout?: Maybe<FormLayout>;
  /** Object containing logo display configuration for form branding. */
  logo?: Maybe<FormLogo>;
  /** Hex color code for the primary theme color used throughout the form. */
  primaryColor?: Maybe<Scalars['String']['output']>;
  /** Boolean displaying a progress indicator showing form completion progress bar. */
  showProgressBar: Scalars['Boolean']['output'];
  /** Object containing submit button styling and text configuration. */
  submitButton?: Maybe<FormSubmitButton>;
  /** Object containing typography and text styling configuration. */
  text?: Maybe<FormText>;
};

/** Visual styling configuration including colors, layout, and branding. */
export type FormAppearanceInput = {
  /** Object containing background appearance configuration for the form. */
  background?: InputMaybe<FormBackgroundInput>;
  /** Boolean hiding monday branding from the form display. */
  hideBranding?: InputMaybe<Scalars['Boolean']['input']>;
  /** Object containing form structure and presentation settings. */
  layout?: InputMaybe<FormLayoutInput>;
  /** Object containing logo display configuration for form branding. */
  logo?: InputMaybe<FormLogoInput>;
  /** Hex color code for the primary theme color used throughout the form. */
  primaryColor?: InputMaybe<Scalars['String']['input']>;
  /** Boolean displaying a progress indicator showing form completion progress bar. */
  showProgressBar?: InputMaybe<Scalars['Boolean']['input']>;
  /** Object containing submit button styling and text configuration. */
  submitButton?: InputMaybe<FormSubmitButtonInput>;
  /** Object containing typography and text styling configuration. */
  text?: InputMaybe<FormTextInput>;
};

/** Object containing background appearance configuration for the form. */
export type FormBackground = {
  __typename?: 'FormBackground';
  /** String specifying background style. */
  type?: Maybe<FormBackgrounds>;
  /** String containing the background value. The value will depend on the background type. If the background type is color, the value will be a hex color code. If the background type is image, the value will be an image URL. */
  value?: Maybe<Scalars['String']['output']>;
};

/** Object containing background appearance configuration for the form. */
export type FormBackgroundInput = {
  /** String specifying background style. */
  type: FormBackgrounds;
  /** String containing the background value. The value will depend on the background type. If the background type is color, the value will be a hex color code. If the background type is image, the value will be an image URL. */
  value?: InputMaybe<Scalars['String']['input']>;
};

export enum FormBackgrounds {
  Color = 'Color',
  Image = 'Image',
  None = 'None'
}

export type FormCloseDate = {
  __typename?: 'FormCloseDate';
  /** ISO timestamp when the form will automatically stop accepting responses. */
  date?: Maybe<Scalars['String']['output']>;
  /** Boolean enabling automatic form closure at a specified date and time. */
  enabled: Scalars['Boolean']['output'];
};

/** Object containing automatic form closure configuration. */
export type FormCloseDateInput = {
  /** ISO timestamp when the form will automatically stop accepting responses. */
  date?: InputMaybe<Scalars['String']['input']>;
  /** Boolean enabling automatic form closure at a specified date and time. */
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
};

export enum FormDirection {
  LtR = 'LtR',
  Rtl = 'Rtl'
}

export type FormDraftSubmission = {
  __typename?: 'FormDraftSubmission';
  /** Boolean allowing users to save incomplete responses as drafts. */
  enabled: Scalars['Boolean']['output'];
};

/** Object containing draft saving configuration allowing users to save progress. */
export type FormDraftSubmissionInput = {
  /** Boolean allowing users to save incomplete responses as drafts. */
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Object containing form features including but not limited to password protection, response limits, login requirements, etc. */
export type FormFeatures = {
  __typename?: 'FormFeatures';
  /** Object containing settings for the post-submission user experience. */
  afterSubmissionView?: Maybe<FormAfterSubmissionView>;
  /** Object containing automatic form closure configuration. */
  closeDate?: Maybe<FormCloseDate>;
  /** Object containing draft saving configuration allowing users to save progress. */
  draftSubmission?: Maybe<FormDraftSubmission>;
  /** Boolean indicating if the form is restricted to internal users only. */
  isInternal: Scalars['Boolean']['output'];
  /** Object containing board settings for response handling. */
  monday?: Maybe<FormMonday>;
  /** Object containing password protection configuration for the form. */
  password?: Maybe<FormPassword>;
  /** Object containing welcome screen configuration displayed before the form. */
  preSubmissionView?: Maybe<FormPreSubmissionView>;
  /** Boolean enabling reCAPTCHA verification to prevent spam submissions. */
  reCaptchaChallenge: Scalars['Boolean']['output'];
  /** Object containing login requirement settings for form access. */
  requireLogin?: Maybe<FormRequireLogin>;
  /** Object containing response limitation settings to control submission volume. */
  responseLimit?: Maybe<FormResponseLimit>;
  /** Object containing shortened URL configuration for easy form sharing. */
  shortenedLink?: Maybe<FormShortenedLink>;
};

/** Form features configuration including security, limits, and access controls. */
export type FormFeaturesInput = {
  /** Object containing settings for the post-submission user experience. */
  afterSubmissionView?: InputMaybe<FormAfterSubmissionViewInput>;
  /** Object containing automatic form closure configuration. */
  closeDate?: InputMaybe<FormCloseDateInput>;
  /** Object containing draft saving configuration allowing users to save progress. */
  draftSubmission?: InputMaybe<FormDraftSubmissionInput>;
  /** Object containing board settings for response handling. */
  monday?: InputMaybe<FormMondayInput>;
  /** Object containing password protection configuration for the form. */
  password?: InputMaybe<FormPasswordInput>;
  /** Object containing welcome screen configuration displayed before the form. */
  preSubmissionView?: InputMaybe<FormPreSubmissionViewInput>;
  /** Boolean enabling reCAPTCHA verification to prevent spam submissions. */
  reCaptchaChallenge?: InputMaybe<Scalars['Boolean']['input']>;
  /** Object containing login requirement settings for form access. */
  requireLogin?: InputMaybe<FormRequireLoginInput>;
  /** Object containing response limitation settings to control submission volume. */
  responseLimit?: InputMaybe<FormResponseLimitInput>;
};

export enum FormFontSize {
  Large = 'Large',
  Medium = 'Medium',
  Small = 'Small'
}

export enum FormFormat {
  Classic = 'Classic',
  OneByOne = 'OneByOne'
}

/** Object containing form structure and presentation settings. */
export type FormLayout = {
  __typename?: 'FormLayout';
  /** String controlling text and content alignment. */
  alignment?: Maybe<FormAlignment>;
  /** String setting reading direction. */
  direction?: Maybe<FormDirection>;
  /** String specifying the form display format. Can be a step by step form or a classic one page form. */
  format?: Maybe<FormFormat>;
};

/** Object containing form structure and presentation settings. */
export type FormLayoutInput = {
  /** String controlling text and content alignment. */
  alignment?: InputMaybe<FormAlignment>;
  /** String setting reading direction. */
  direction?: InputMaybe<FormDirection>;
  /** String specifying the form display format. Can be a step by step form or a classic one page form. */
  format?: InputMaybe<FormFormat>;
};

/** Object containing logo display configuration for form branding. */
export type FormLogo = {
  __typename?: 'FormLogo';
  /** String specifying logo placement ("top", "bottom", "header"). */
  position?: Maybe<FormLogoPosition>;
  /** String specifying logo size ("small", "medium", "large") for the logo that appears on the header of the form. */
  size?: Maybe<FormLogoSize>;
  /** URL pointing to the logo image file for display on the form. */
  url?: Maybe<Scalars['String']['output']>;
};

/** Object containing logo display configuration for form branding. */
export type FormLogoInput = {
  /** String specifying logo placement ("top", "bottom", "header"). */
  position?: InputMaybe<FormLogoPosition>;
  /** String specifying logo size ("small", "medium", "large") for the logo that appears on the header of the form. */
  size?: InputMaybe<FormLogoSize>;
};

export enum FormLogoPosition {
  Auto = 'Auto',
  Center = 'Center',
  Left = 'Left',
  Right = 'Right'
}

/** Available logo sizes for form branding */
export enum FormLogoSize {
  /** Extra large logo size for maximum form branding impact, height of 96px, width will be scaled to maintain aspect ratio */
  ExtraLarge = 'ExtraLarge',
  /** Large logo size for prominent form branding, height of 72px, width will be scaled to maintain aspect ratio */
  Large = 'Large',
  /** Medium logo size for standard form branding, height of 40px, width will be scaled to maintain aspect ratio */
  Medium = 'Medium',
  /** Small logo size for compact form branding, height of 32px, width will be scaled to maintain aspect ratio */
  Small = 'Small'
}

export type FormMonday = {
  __typename?: 'FormMonday';
  /** Boolean adding a name question to the form. This is a special question type that represents the name column from the associated monday board */
  includeNameQuestion: Scalars['Boolean']['output'];
  /** Boolean adding an update/comment field to the form. This is a special question type that represents the updates from the associated item of the submission on the monday board.  */
  includeUpdateQuestion: Scalars['Boolean']['output'];
  /** The board group ID where new items from form responses will be created. */
  itemGroupId?: Maybe<Scalars['String']['output']>;
  /** Boolean synchronizing form question titles with board column names. When true, the form question titles will be synchronized with the board column names. */
  syncQuestionAndColumnsTitles: Scalars['Boolean']['output'];
};

/** Object containing board settings for response handling. */
export type FormMondayInput = {
  /** Boolean adding a name question to the form. This is a special question type that represents the name column from the associated monday board */
  includeNameQuestion?: InputMaybe<Scalars['Boolean']['input']>;
  /** Boolean adding an update/comment field to the form. This is a special question type that represents the updates from the associated item of the submission on the monday board.  */
  includeUpdateQuestion?: InputMaybe<Scalars['Boolean']['input']>;
  /** The board group ID where new items from form responses will be created. */
  itemGroupId?: InputMaybe<Scalars['String']['input']>;
  /** Boolean synchronizing form question titles with board column names. When true, the form question titles will be synchronized with the board column names. */
  syncQuestionAndColumnsTitles?: InputMaybe<Scalars['Boolean']['input']>;
};

export type FormPassword = {
  __typename?: 'FormPassword';
  /** Boolean disabling password protection. Can only be updated to false, to enable password protection, use the set_form_password mutation instead. */
  enabled: Scalars['Boolean']['output'];
};

/** Password configuration for the form. Only setting enabled to false is supported. To enable a form to be password protected, please use the set_form_password mutation instead. */
export type FormPasswordInput = {
  /** Boolean disabling password protection. Can only be updated to false, to enable password protection, use the set_form_password mutation instead. */
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
};

export type FormPreSubmissionView = {
  __typename?: 'FormPreSubmissionView';
  /** Text providing context or instructions on the welcome screen. */
  description?: Maybe<Scalars['String']['output']>;
  /** Boolean showing a welcome/introduction screen before the form begins. */
  enabled: Scalars['Boolean']['output'];
  /** Object containing start button configuration for the welcome screen. */
  startButton?: Maybe<FormStartButton>;
  /** Text displayed as the title on the welcome screen. */
  title?: Maybe<Scalars['String']['output']>;
};

/** Object containing welcome screen configuration displayed before the form. */
export type FormPreSubmissionViewInput = {
  /** Text providing context or instructions on the welcome screen. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Boolean showing a welcome/introduction screen before the form begins. */
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Object containing start button configuration for the welcome screen. */
  startButton?: InputMaybe<FormStartButtonInput>;
  /** Text displayed as the title on the welcome screen. */
  title?: InputMaybe<Scalars['String']['input']>;
};

export type FormQuestion = {
  __typename?: 'FormQuestion';
  /** Optional explanatory text providing additional context, instructions, or examples for the question. */
  description?: Maybe<Scalars['String']['output']>;
  /** The unique identifier for the question. Used to target specific questions within a form. */
  id: Scalars['String']['output'];
  options?: Maybe<Array<FormQuestionOption>>;
  /** Boolean indicating if the question must be answered before form submission. */
  required: Scalars['Boolean']['output'];
  settings?: Maybe<FormQuestionSettings>;
  showIfRules?: Maybe<Scalars['JSON']['output']>;
  /** The question text displayed to respondents. Must be at least 1 character long and clearly indicate the expected response. */
  title: Scalars['String']['output'];
  /** The question type determining input behavior and validation (e.g., "text", "email", "single_select", "multi_select"). */
  type?: Maybe<FormQuestionType>;
  /** Boolean controlling question visibility to respondents. Hidden questions remain in form structure but are not displayed. */
  visible: Scalars['Boolean']['output'];
};

export type FormQuestionOption = {
  __typename?: 'FormQuestionOption';
  /** The display text for individual option choices in select-type questions. */
  label: Scalars['String']['output'];
};

/** Sources for prefilling question values */
export enum FormQuestionPrefillSources {
  Account = 'Account',
  QueryParam = 'QueryParam'
}

/** Display options for select-type questions */
export enum FormQuestionSelectDisplay {
  Dropdown = 'Dropdown',
  Horizontal = 'Horizontal',
  Vertical = 'Vertical'
}

/** Ordering options for select question options */
export enum FormQuestionSelectOrderByOptions {
  Alphabetical = 'Alphabetical',
  Custom = 'Custom',
  Random = 'Random'
}

/** Question-specific configuration object that varies by question type. */
export type FormQuestionSettings = {
  __typename?: 'FormQuestionSettings';
  /** Boolean/checkbox questions only: Whether the checkbox should be checked by default when the form loads. */
  checkedByDefault?: Maybe<Scalars['Boolean']['output']>;
  /** Date based questions only: Automatically set the current date as the default value when the form loads. */
  defaultCurrentDate?: Maybe<Scalars['Boolean']['output']>;
  /** Single/Multi Select questions only: Controls how the selection options are visually presented to users. */
  display?: Maybe<FormQuestionSelectDisplay>;
  /** Date questions only: Whether to include time selection (hours and minutes) in addition to the date picker. When false, only date selection is available. */
  includeTime?: Maybe<Scalars['Boolean']['output']>;
  /** Rating questions only: Maximum rating value that users can select. */
  limit?: Maybe<Scalars['Int']['output']>;
  /** Location questions only: Automatically detect and fill the user's current location using browser geolocation services, requiring user permission. */
  locationAutofilled?: Maybe<Scalars['Boolean']['output']>;
  /** Single/Multi Select questions only: Determines the ordering of selection options. */
  optionsOrder?: Maybe<FormQuestionSelectOrderByOptions>;
  /** Configuration for automatically populating question values from various data sources such as user account information or URL query parameters. */
  prefill?: Maybe<PrefillSettings>;
  /** Phone questions only: Automatically detect and fill the phone country prefix based on the user's geographic location or browser settings. */
  prefixAutofilled?: Maybe<Scalars['Boolean']['output']>;
  /** Phone questions only: Configuration for setting a specific predefined phone country prefix that will be pre-selected for users. */
  prefixPredefined?: Maybe<PhonePrefixPredefined>;
  /** Link/URL questions only: Whether to skip URL format validation, allowing any text input. */
  skipValidation?: Maybe<Scalars['Boolean']['output']>;
};

/** Question-specific configuration object that varies by question type. */
export type FormQuestionSettingsInput = {
  /** Boolean/checkbox questions only: Whether the checkbox should be checked by default when the form loads. */
  checkedByDefault?: InputMaybe<Scalars['Boolean']['input']>;
  /** Date based questions only: Automatically set the current date as the default value when the form loads. */
  defaultCurrentDate?: InputMaybe<Scalars['Boolean']['input']>;
  /** Single/Multi Select questions only: Controls how the selection options are visually presented to users. */
  display?: InputMaybe<FormQuestionSelectDisplay>;
  /** Date questions only: Whether to include time selection (hours and minutes) in addition to the date picker. When false, only date selection is available. */
  includeTime?: InputMaybe<Scalars['Boolean']['input']>;
  /** Multi Select questions only: Limits the number of options a user can select. */
  labelLimitCount?: InputMaybe<Scalars['Int']['input']>;
  /** Location questions only: Automatically detect and fill the user's current location using browser geolocation services, requiring user permission. */
  locationAutofilled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Single/Multi Select questions only: Determines the ordering of selection options. */
  optionsOrder?: InputMaybe<FormQuestionSelectOrderByOptions>;
  /** Configuration for automatically populating question values from various data sources such as user account information or URL query parameters. */
  prefill?: InputMaybe<PrefillSettingsInput>;
  /** Phone questions only: Automatically detect and fill the phone country prefix based on the user's geographic location or browser settings. */
  prefixAutofilled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Phone questions only: Configuration for setting a specific predefined phone country prefix that will be pre-selected for users. */
  prefixPredefined?: InputMaybe<PhonePrefixPredefinedInput>;
  /** Link/URL questions only: Whether to skip URL format validation, allowing any text input. */
  skipValidation?: InputMaybe<Scalars['Boolean']['input']>;
};

/** The type of the question (ex. text, number, MultiSelect etc.) */
export enum FormQuestionType {
  Boolean = 'Boolean',
  ConnectedBoards = 'ConnectedBoards',
  Country = 'Country',
  Date = 'Date',
  DateRange = 'DateRange',
  Email = 'Email',
  File = 'File',
  Link = 'Link',
  Location = 'Location',
  LongText = 'LongText',
  MultiSelect = 'MultiSelect',
  Name = 'Name',
  Number = 'Number',
  People = 'People',
  Phone = 'Phone',
  Rating = 'Rating',
  ShortText = 'ShortText',
  Signature = 'Signature',
  SingleSelect = 'SingleSelect',
  Subitems = 'Subitems',
  Updates = 'Updates'
}

export type FormRedirectAfterSubmission = {
  __typename?: 'FormRedirectAfterSubmission';
  /** Boolean enabling automatic redirect after form completion to a specified URL. */
  enabled: Scalars['Boolean']['output'];
  /** The URL where users will be redirected after successfully submitting the form. */
  redirectUrl?: Maybe<Scalars['String']['output']>;
};

/** Object containing redirect configuration after form submission. */
export type FormRedirectAfterSubmissionInput = {
  /** Boolean enabling automatic redirect after form completion to a specified URL. */
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  /** The URL where users will be redirected after successfully submitting the form. */
  redirectUrl?: InputMaybe<Scalars['String']['input']>;
};

export type FormRequireLogin = {
  __typename?: 'FormRequireLogin';
  /** Boolean requiring users to be logged in before submitting responses. */
  enabled: Scalars['Boolean']['output'];
  /** Boolean automatically redirecting unauthenticated users to the login page. */
  redirectToLogin: Scalars['Boolean']['output'];
};

/** Object containing login requirement settings for form access. */
export type FormRequireLoginInput = {
  /** Boolean requiring users to be logged in before submitting responses. */
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Boolean automatically redirecting unauthenticated users to the login page. */
  redirectToLogin?: InputMaybe<Scalars['Boolean']['input']>;
};

export type FormResponseLimit = {
  __typename?: 'FormResponseLimit';
  /** Boolean enabling response count limits for the form. */
  enabled: Scalars['Boolean']['output'];
  /** Integer specifying the maximum number of responses allowed. */
  limit?: Maybe<Scalars['Int']['output']>;
};

/** Object containing response limitation settings to control submission volume. */
export type FormResponseLimitInput = {
  /** Boolean enabling response count limits for the form. */
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  /** Integer specifying the maximum number of responses allowed. */
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type FormShortenedLink = {
  __typename?: 'FormShortenedLink';
  /** Boolean enabling generation of shortened URLs for the form. */
  enabled: Scalars['Boolean']['output'];
  /** The generated shortened URL for form access. Only available when shortened links are enabled. */
  url?: Maybe<Scalars['String']['output']>;
};

export type FormStartButton = {
  __typename?: 'FormStartButton';
  /** Custom text for the button that begins the form experience. */
  text?: Maybe<Scalars['String']['output']>;
};

/** Object containing start button configuration for the welcome screen. */
export type FormStartButtonInput = {
  /** Custom text for the button that begins the form experience. */
  text?: InputMaybe<Scalars['String']['input']>;
};

/** Object containing submit button styling and text configuration. */
export type FormSubmitButton = {
  __typename?: 'FormSubmitButton';
  /** Custom text displayed on the form submission button. */
  text?: Maybe<Scalars['String']['output']>;
};

/** Object containing submit button styling and text configuration. */
export type FormSubmitButtonInput = {
  /** Custom text displayed on the form submission button. */
  text?: InputMaybe<Scalars['String']['input']>;
};

export type FormTag = {
  __typename?: 'FormTag';
  /** The ID of the column this tag is associated with */
  columnId: Scalars['String']['output'];
  /** The unique identifier for the tag */
  id: Scalars['String']['output'];
  /** The name of the tag */
  name: Scalars['String']['output'];
  /** The value of the tag */
  value?: Maybe<Scalars['String']['output']>;
};

/** Object containing typography and text styling configuration. */
export type FormText = {
  __typename?: 'FormText';
  /** Hex color code for the text color in the form. */
  color?: Maybe<Scalars['String']['output']>;
  /** String specifying the font family used throughout the form. */
  font?: Maybe<Scalars['String']['output']>;
  /** String or number specifying the base font size for form text. */
  size?: Maybe<FormFontSize>;
};

/** Object containing typography and text styling configuration. */
export type FormTextInput = {
  /** Hex color code for the text color in the form. */
  color?: InputMaybe<Scalars['String']['input']>;
  /** String specifying the font family used throughout the form. */
  font?: InputMaybe<Scalars['String']['input']>;
  /** String or number specifying the base font size for form text. */
  size?: InputMaybe<FormFontSize>;
};

export type FormulaValue = ColumnValue & {
  __typename?: 'FormulaValue';
  /** The column that this value belongs to. */
  column: Column;
  /** A string representing all the formula values, separated by commas */
  display_value: Scalars['String']['output'];
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** Text representation of the column value. Note: Not all columns support textual value */
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

export type GrantMarketplaceAppDiscount = {
  __typename?: 'GrantMarketplaceAppDiscount';
  /** The id of an app */
  app_id: Scalars['ID']['output'];
  /** List of app plan ids */
  app_plan_ids: Array<Scalars['String']['output']>;
  /** Number of days a discount will be valid */
  days_valid: Scalars['Int']['output'];
  /** Percentage value of a discount */
  discount: Scalars['Int']['output'];
  /** Is discount recurring */
  is_recurring: Scalars['Boolean']['output'];
  period?: Maybe<DiscountPeriod>;
};

export type GrantMarketplaceAppDiscountData = {
  /** List of app plan ids */
  app_plan_ids: Array<Scalars['String']['input']>;
  /** Number of days a discount will be valid */
  days_valid: Scalars['Int']['input'];
  /** Percentage value of a discount */
  discount: Scalars['Int']['input'];
  /** Is discount recurring */
  is_recurring: Scalars['Boolean']['input'];
  /** The period of a discount */
  period?: InputMaybe<DiscountPeriod>;
};

export type GrantMarketplaceAppDiscountResult = {
  __typename?: 'GrantMarketplaceAppDiscountResult';
  granted_discount: GrantMarketplaceAppDiscount;
};

/** Represents a folder in the hierarchy */
export type GraphqlFolder = {
  __typename?: 'GraphqlFolder';
  /** The account identifier this folder belongs to */
  accountId?: Maybe<Scalars['ID']['output']>;
  /** The timestamp when this folder was created */
  createdAt?: Maybe<Scalars['Date']['output']>;
  /** The user who created this folder */
  createdBy?: Maybe<Scalars['ID']['output']>;
  /** The unique identifier of the folder */
  id?: Maybe<Scalars['ID']['output']>;
  /** The name of the folder */
  name?: Maybe<Scalars['String']['output']>;
  /** The timestamp when this folder was last updated */
  updatedAt?: Maybe<Scalars['Date']['output']>;
};

/** Represents an item in favorites */
export type GraphqlHierarchyObjectItem = {
  __typename?: 'GraphqlHierarchyObjectItem';
  /** The account identifier this item belongs to */
  accountId?: Maybe<Scalars['ID']['output']>;
  /** The timestamp when this item was created */
  createdAt?: Maybe<Scalars['Date']['output']>;
  /** The folder identifier if the item is contained within a folder */
  folderId?: Maybe<Scalars['ID']['output']>;
  /** The unique identifier of the hierarchy item */
  id?: Maybe<Scalars['ID']['output']>;
  /** The object identifier and type */
  object?: Maybe<HierarchyObjectId>;
  /** The position of the item within its list or folder */
  position?: Maybe<Scalars['Float']['output']>;
  /** The timestamp when this item was last updated */
  updatedAt?: Maybe<Scalars['Date']['output']>;
};

/** Represents a monday object. */
export enum GraphqlMondayObject {
  /** A monday.com board */
  Board = 'Board',
  /** Aggregates data from one or more boards. */
  Dashboard = 'Dashboard',
  /** A monday.com folder */
  Folder = 'Folder'
}

/** A group of items in a board. */
export type Group = {
  __typename?: 'Group';
  /** Is the group archived or not. */
  archived?: Maybe<Scalars['Boolean']['output']>;
  /** The group's color. */
  color: Scalars['String']['output'];
  /** Is the group deleted or not. */
  deleted?: Maybe<Scalars['Boolean']['output']>;
  /** The group's unique identifier. */
  id: Scalars['ID']['output'];
  /** The items in the group. */
  items_page: ItemsResponse;
  /** The group's position in the board. */
  position: Scalars['String']['output'];
  /** The group's title. */
  title: Scalars['String']['output'];
};


/** A group of items in a board. */
export type GroupItems_PageArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  hierarchy_scope_config?: InputMaybe<Scalars['String']['input']>;
  limit?: Scalars['Int']['input'];
  query_params?: InputMaybe<ItemsQuery>;
};

/** The group attributes available. */
export enum GroupAttributes {
  /** Group color (one of the supported colors, check the API documentation). */
  Color = 'color',
  /** The group's position in the board. Deprecated! - replaced with relative position */
  Position = 'position',
  /** The group's relative position after another group in the board. */
  RelativePositionAfter = 'relative_position_after',
  /** The group's relative position before another group in the board. */
  RelativePositionBefore = 'relative_position_before',
  /** Group title. */
  Title = 'title'
}

/** Configuration settings for group by column */
export type GroupByColumnConfigInput = {
  /** Sort settings for the column */
  sortSettings?: InputMaybe<GroupBySortSettingsInput>;
};

/** Condition for grouping items by column */
export type GroupByConditionInput = {
  /** ID of the column to group by */
  columnId: Scalars['String']['input'];
  /** Configuration for the group by column */
  config?: InputMaybe<GroupByColumnConfigInput>;
};

/** Settings for grouping board items */
export type GroupBySettingsInput = {
  /** List of conditions for grouping items */
  conditions: Array<GroupByConditionInput>;
  /** Whether to hide groups with no items */
  hideEmptyGroups?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Sort settings for group by configuration */
export type GroupBySortSettingsInput = {
  /** Sort direction for the group */
  direction: SortDirection;
  /** Type of sorting to apply */
  type?: InputMaybe<Scalars['String']['input']>;
};

export type GroupValue = ColumnValue & {
  __typename?: 'GroupValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The group value. */
  group?: Maybe<Group>;
  /** The group identifier. */
  group_id?: Maybe<Scalars['ID']['output']>;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** Text representation of the column value. Note: Not all columns support textual value */
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** Represents a monday object identifier with its type */
export type HierarchyObjectId = {
  __typename?: 'HierarchyObjectID';
  /** The unique identifier of the object */
  id?: Maybe<Scalars['ID']['output']>;
  /** The type of the object */
  type?: Maybe<GraphqlMondayObject>;
};

/** Input type for identifying a favorites object by its ID and type */
export type HierarchyObjectIdInputType = {
  /** The ID of the object */
  id: Scalars['ID']['input'];
  /** The type of the object */
  type: GraphqlMondayObject;
};

export type HourValue = ColumnValue & {
  __typename?: 'HourValue';
  /** The column that this value belongs to. */
  column: Column;
  /** Hour */
  hour?: Maybe<Scalars['Int']['output']>;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** Minute */
  minute?: Maybe<Scalars['Int']['output']>;
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** Input for creating image blocks */
export type ImageBlockInput = {
  /** The parent block id to append the created block under. */
  parent_block_id?: InputMaybe<Scalars['String']['input']>;
  /** The public URL of the image */
  public_url: Scalars['String']['input'];
  /** The width of the image */
  width?: InputMaybe<Scalars['Int']['input']>;
};

/** Content for an image block */
export type ImageContent = DocBaseBlockContent & {
  __typename?: 'ImageContent';
  /** The alignment of the block content */
  alignment?: Maybe<BlockAlignment>;
  /** The text direction of the block content */
  direction?: Maybe<BlockDirection>;
  /** The public URL of the image */
  public_url: Scalars['String']['output'];
  /** The width of the image */
  width?: Maybe<Scalars['Int']['output']>;
};

/** Response from importing an HTML document. Contains success status and the ID of the newly created document. */
export type ImportDocFromHtmlResult = {
  __typename?: 'ImportDocFromHtmlResult';
  /** The ID of the newly created document. Use this ID to reference or modify the imported document. */
  doc_id?: Maybe<Scalars['String']['output']>;
  /** Detailed error message if the operation failed. Check this when success is false. */
  error?: Maybe<Scalars['String']['output']>;
  /** True if HTML was successfully converted and imported as a new document */
  success: Scalars['Boolean']['output'];
};

/** Content inserted in delta operations */
export type InsertOps = {
  __typename?: 'InsertOps';
  /** Object representing structured data within a text block */
  blot?: Maybe<BlotContent>;
  /** Plain text content */
  text?: Maybe<Scalars['String']['output']>;
};

/** Content to insert in delta operations */
export type InsertOpsInput = {
  /** Object representing structured data within a text block */
  blot?: InputMaybe<BlotInput>;
  /** Plain text content */
  text?: InputMaybe<Scalars['String']['input']>;
};

export type IntegrationValue = ColumnValue & {
  __typename?: 'IntegrationValue';
  /** The column that this value belongs to. */
  column: Column;
  /** ID of the entity */
  entity_id?: Maybe<Scalars['ID']['output']>;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** URL of the issue */
  issue_api_url?: Maybe<Scalars['ID']['output']>;
  /** ID of the issue */
  issue_id?: Maybe<Scalars['String']['output']>;
  /** Text representation of the column value. Note: Not all columns support textual value */
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** Error that occurred while inviting users */
export type InviteUsersError = {
  __typename?: 'InviteUsersError';
  /** The error code. */
  code?: Maybe<InviteUsersErrorCode>;
  /** The email address for the user that caused the error. */
  email?: Maybe<Scalars['ID']['output']>;
  /** The error message. */
  message?: Maybe<Scalars['String']['output']>;
};

/** Error codes that can occur while changing email domain. */
export enum InviteUsersErrorCode {
  Error = 'ERROR'
}

/** Result of inviting users to the account. */
export type InviteUsersResult = {
  __typename?: 'InviteUsersResult';
  /** Errors that occurred while inviting users */
  errors?: Maybe<Array<InviteUsersError>>;
  /** The users that were successfully invited. */
  invited_users?: Maybe<Array<User>>;
};

/** An item (table row). */
export type Item = {
  __typename?: 'Item';
  /** The item's assets/files. */
  assets?: Maybe<Array<Maybe<Asset>>>;
  /** The board that contains this item. */
  board?: Maybe<Board>;
  /** The item's column values. */
  column_values: Array<ColumnValue>;
  /** The item's create date. */
  created_at?: Maybe<Scalars['Date']['output']>;
  /** The item's creator. */
  creator?: Maybe<User>;
  /** The unique identifier of the item creator. */
  creator_id: Scalars['String']['output'];
  /** The item's description */
  description?: Maybe<ItemDescription>;
  /** The item's email. */
  email: Scalars['String']['output'];
  /** The group that contains this item. */
  group?: Maybe<Group>;
  /** The item's unique identifier. */
  id: Scalars['ID']['output'];
  /** The item's linked items */
  linked_items: Array<Item>;
  /** The item's name. */
  name: Scalars['String']['output'];
  /** The parent item of a subitem. */
  parent_item?: Maybe<Item>;
  /** The item's relative path */
  relative_link?: Maybe<Scalars['String']['output']>;
  /** The item's state (all / active / archived / deleted). */
  state?: Maybe<State>;
  /** The item's subitems. */
  subitems?: Maybe<Array<Maybe<Item>>>;
  /** The pulses's subscribers. */
  subscribers: Array<Maybe<User>>;
  /** The item's last update date. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The item's updates. */
  updates?: Maybe<Array<Update>>;
  /** The item's link */
  url: Scalars['String']['output'];
};


/** An item (table row). */
export type ItemAssetsArgs = {
  assets_source?: InputMaybe<AssetsSource>;
  column_ids?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};


/** An item (table row). */
export type ItemColumn_ValuesArgs = {
  capabilities?: InputMaybe<Array<ColumnCapability>>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  types?: InputMaybe<Array<ColumnType>>;
};


/** An item (table row). */
export type ItemLinked_ItemsArgs = {
  link_to_item_column_id: Scalars['String']['input'];
  linked_board_id: Scalars['ID']['input'];
};


/** An item (table row). */
export type ItemUpdatesArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};

/** An item description. */
export type ItemDescription = {
  __typename?: 'ItemDescription';
  /** The item's content blocks */
  blocks?: Maybe<Array<Maybe<DocumentBlock>>>;
  /** The item's unique identifier. */
  id?: Maybe<Scalars['ID']['output']>;
};


/** An item description. */
export type ItemDescriptionBlocksArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};

export type ItemIdValue = ColumnValue & {
  __typename?: 'ItemIdValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** ID of the item */
  item_id: Scalars['ID']['output'];
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** Input type for item nickname configuration */
export type ItemNicknameInput = {
  /** The plural form of the item nickname */
  plural?: InputMaybe<Scalars['String']['input']>;
  /** The preset type for item nickname */
  preset_type?: InputMaybe<Scalars['String']['input']>;
  /** The singular form of the item nickname */
  singular?: InputMaybe<Scalars['String']['input']>;
};

/** Sort direction */
export enum ItemsOrderByDirection {
  /** Ascending order */
  Asc = 'asc',
  /** Descending order */
  Desc = 'desc'
}

export type ItemsPageByColumnValuesQuery = {
  /** The column's unique identifier. */
  column_id: Scalars['String']['input'];
  /** The column values to search items by. */
  column_values: Array<InputMaybe<Scalars['String']['input']>>;
};

export type ItemsQuery = {
  /** A list of rule groups */
  groups?: InputMaybe<Array<ItemsQueryGroup>>;
  /** A list of item IDs to fetch. Use this to fetch a specific set of items by their IDs. Limited to 100 IDs in ItemsQuery */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** The operator to use for the query rules or rule groups. Default: AND */
  operator?: InputMaybe<ItemsQueryOperator>;
  /** Sort the results by specified columns */
  order_by?: InputMaybe<Array<ItemsQueryOrderBy>>;
  /** A list of rules */
  rules?: InputMaybe<Array<ItemsQueryRule>>;
};

/** A group of rules or rule groups */
export type ItemsQueryGroup = {
  /** A list of rule groups */
  groups?: InputMaybe<Array<ItemsQueryGroup>>;
  /** The operator to use for the query rules or rule groups. Default: AND */
  operator?: InputMaybe<ItemsQueryOperator>;
  /** A list of rules */
  rules?: InputMaybe<Array<ItemsQueryRule>>;
};

/** Logical operator */
export enum ItemsQueryOperator {
  /** Logical AND */
  And = 'and',
  /** Logical OR */
  Or = 'or'
}

/** Sort the results by specified columns */
export type ItemsQueryOrderBy = {
  column_id: Scalars['String']['input'];
  /** Sort direction (defaults to ASC) */
  direction?: InputMaybe<ItemsOrderByDirection>;
};

/** A rule to filter items by a specific column */
export type ItemsQueryRule = {
  column_id: Scalars['ID']['input'];
  compare_attribute?: InputMaybe<Scalars['String']['input']>;
  compare_value: Scalars['CompareValue']['input'];
  operator?: InputMaybe<ItemsQueryRuleOperator>;
};

/** Rule operator */
export enum ItemsQueryRuleOperator {
  /** Any of the values */
  AnyOf = 'any_of',
  /** Between the two values */
  Between = 'between',
  /** Contains all the terms */
  ContainsTerms = 'contains_terms',
  /** Contains the text */
  ContainsText = 'contains_text',
  /** Ends with the value */
  EndsWith = 'ends_with',
  /** Greater than the value */
  GreaterThan = 'greater_than',
  /** Greater than or equal to the value */
  GreaterThanOrEquals = 'greater_than_or_equals',
  /** Empty value */
  IsEmpty = 'is_empty',
  /** Not empty value */
  IsNotEmpty = 'is_not_empty',
  /** Lower than the value */
  LowerThan = 'lower_than',
  /** Lower than or equal to the value */
  LowerThanOrEqual = 'lower_than_or_equal',
  /** None of the values */
  NotAnyOf = 'not_any_of',
  /** Does not contain the text */
  NotContainsText = 'not_contains_text',
  /** Starts with the value */
  StartsWith = 'starts_with',
  /** Within the last */
  WithinTheLast = 'within_the_last',
  /** Within the next */
  WithinTheNext = 'within_the_next'
}

export type ItemsResponse = {
  __typename?: 'ItemsResponse';
  /**
   * An opaque cursor that represents the position in the list after the last
   * returned item. Use this cursor for pagination to fetch the next set of items.
   * If the cursor is null, there are no more items to fetch.
   */
  cursor?: Maybe<Scalars['String']['output']>;
  /** The items associated with the cursor. */
  items: Array<Item>;
};

/** Kind of assignee */
export enum Kind {
  /** Represents a person */
  Person = 'person',
  /** Represents a team */
  Team = 'team'
}

export type LastUpdatedValue = ColumnValue & {
  __typename?: 'LastUpdatedValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** Timestamp of the last time the item was updated */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** User who updated the item */
  updater?: Maybe<User>;
  /** ID of the user who updated the item */
  updater_id?: Maybe<Scalars['ID']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/**
 * Input for creating layout blocks.
 *
 * Behaviour:
 * • When a layout is created the system automatically generates
 *   column_count child "cell" blocks (one per column).
 * • The layout block itself is just a container; each generated cell block has
 *   parentBlockId === <layout-block-id> and acts as the direct parent for any
 *   content you want to insert into that column.
 * • The creation response already contains the ordered list of generated cell
 *   IDs under `content[0].cells` (1-D array from left to right).
 * • To populate a layout:
 *     1. Create the layout and capture its ID.
 *     2. Obtain the cell block IDs either by inspecting `content[0].cells`
 *        in the response **or** by querying the document for children of the
 *        layout block.
 *     3. Create your content blocks (textBlock, imageBlock, tableBlock, etc.)
 *        with parentBlockId set to the specific cell block ID.
 * • Use afterBlockId only to order siblings *within* the same cell.
 */
export type LayoutBlockInput = {
  /** The number of columns in the layout */
  column_count: Scalars['Int']['input'];
  /** The column style configuration */
  column_style?: InputMaybe<Array<ColumnStyleInput>>;
  /** The parent block id to append the created block under. */
  parent_block_id?: InputMaybe<Scalars['String']['input']>;
};

/** Content for a layout block */
export type LayoutContent = DocBaseBlockContent & {
  __typename?: 'LayoutContent';
  /** The alignment of the block content */
  alignment?: Maybe<BlockAlignment>;
  /** 1-D array of cells (columns). Each cell carries a blockId reference. */
  cells?: Maybe<Array<Cell>>;
  /** The column style configuration */
  column_style?: Maybe<Array<ColumnStyle>>;
  /** The text direction of the block content */
  direction?: Maybe<BlockDirection>;
};

export type Like = {
  __typename?: 'Like';
  created_at?: Maybe<Scalars['Date']['output']>;
  creator?: Maybe<User>;
  creator_id?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  reaction_type?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['Date']['output']>;
};

export type LinkValue = ColumnValue & {
  __typename?: 'LinkValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** Url */
  url?: Maybe<Scalars['String']['output']>;
  /** Url text */
  url_text?: Maybe<Scalars['String']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** Specific types of list blocks */
export enum ListBlock {
  BulletedList = 'BULLETED_LIST',
  CheckList = 'CHECK_LIST',
  NumberedList = 'NUMBERED_LIST'
}

/** Content for a list block (bulleted, numbered, todo) */
export type ListBlockContent = DocBaseBlockContent & {
  __typename?: 'ListBlockContent';
  /** The alignment of the block content */
  alignment?: Maybe<BlockAlignment>;
  /** The text content in delta format - array of operations with insert content and optional attributes */
  delta_format: Array<Operation>;
  /** The text direction of the block content */
  direction?: Maybe<BlockDirection>;
  /** The indentation level of the list item */
  indentation?: Maybe<Scalars['Int']['output']>;
};

/** Input for creating list blocks (bulleted, numbered, todo) */
export type ListBlockInput = {
  alignment?: InputMaybe<BlockAlignment>;
  /** The text content in delta format - array of operations with insert content and optional attributes */
  delta_format: Array<OperationInput>;
  direction?: InputMaybe<BlockDirection>;
  /** The indentation level of the list item */
  indentation?: InputMaybe<Scalars['Int']['input']>;
  /** The specific type of list block (defaults to bulleted list) */
  list_block_type?: InputMaybe<ListBlock>;
  /** The parent block id to append the created block under. */
  parent_block_id?: InputMaybe<Scalars['String']['input']>;
};

export type LocationValue = ColumnValue & {
  __typename?: 'LocationValue';
  /** Address */
  address?: Maybe<Scalars['String']['output']>;
  /** City */
  city?: Maybe<Scalars['String']['output']>;
  /** City */
  city_short?: Maybe<Scalars['String']['output']>;
  /** The column that this value belongs to. */
  column: Column;
  /** Country */
  country?: Maybe<Scalars['String']['output']>;
  /** Country short name (e.g. PE for Peru) */
  country_short?: Maybe<Scalars['String']['output']>;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** Latitude */
  lat?: Maybe<Scalars['Float']['output']>;
  /** Longitude */
  lng?: Maybe<Scalars['Float']['output']>;
  /** Place ID of the location */
  place_id?: Maybe<Scalars['String']['output']>;
  /** Street */
  street?: Maybe<Scalars['String']['output']>;
  /** Number of building in the street */
  street_number?: Maybe<Scalars['String']['output']>;
  /** Short number of building in the street */
  street_number_short?: Maybe<Scalars['String']['output']>;
  /** Street */
  street_short?: Maybe<Scalars['String']['output']>;
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

export type LongTextValue = ColumnValue & {
  __typename?: 'LongTextValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** Text representation of the column value. Note: Not all columns support textual value */
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

export type ManagedColumn = {
  __typename?: 'ManagedColumn';
  created_at?: Maybe<Scalars['Date']['output']>;
  created_by?: Maybe<Scalars['ID']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  revision?: Maybe<Scalars['Int']['output']>;
  settings?: Maybe<ColumnSettings>;
  settings_json?: Maybe<Scalars['JSON']['output']>;
  state?: Maybe<ManagedColumnState>;
  title?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['Date']['output']>;
  updated_by?: Maybe<Scalars['ID']['output']>;
};

export enum ManagedColumnState {
  Active = 'active',
  Deleted = 'deleted',
  Inactive = 'inactive'
}

export enum ManagedColumnTypes {
  Dropdown = 'dropdown',
  Status = 'status'
}

export type MarketplaceAiSearchInput = {
  /** Maximum number of search results to return */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** The search query term */
  query: Scalars['String']['input'];
};

export type MarketplaceAiSearchResult = {
  __typename?: 'MarketplaceAiSearchResult';
  /** List of relevant features that match the user needs */
  features: Array<Scalars['String']['output']>;
  /** The ID of the marketplace app */
  marketplace_app_id: Scalars['ID']['output'];
  /** How well the app matches the user query (0-100) */
  match_percentage: Scalars['Float']['output'];
  /** The name of the marketplace app */
  name: Scalars['String']['output'];
};

export type MarketplaceAiSearchResults = {
  __typename?: 'MarketplaceAiSearchResults';
  results: Array<MarketplaceAiSearchResult>;
};

export type MarketplaceAppDiscount = {
  __typename?: 'MarketplaceAppDiscount';
  /** The ID of an account */
  account_id: Scalars['ID']['output'];
  /** Slug of an account */
  account_slug: Scalars['String']['output'];
  /** List of app plan ids */
  app_plan_ids: Array<Scalars['String']['output']>;
  /** Date when a discount was created */
  created_at: Scalars['String']['output'];
  /** Percentage value of a discount */
  discount: Scalars['Int']['output'];
  /** Is discount recurring */
  is_recurring: Scalars['Boolean']['output'];
  period?: Maybe<DiscountPeriod>;
  /** Date until a discount is valid */
  valid_until: Scalars['String']['output'];
};

export type MarketplaceAppMetadata = {
  __typename?: 'MarketplaceAppMetadata';
  /** The number of installs for the marketplace app */
  installsCount: Scalars['Int']['output'];
  /** The average rating of the marketplace app */
  rating: Scalars['Float']['output'];
  /** The number of ratings for the marketplace app */
  ratingCount: Scalars['Int']['output'];
};

export type MarketplaceSearchAppDocument = {
  __typename?: 'MarketplaceSearchAppDocument';
  /** The description of the marketplace app */
  description: Scalars['String']['output'];
  /** The keywords associated with the marketplace app */
  keywords: Scalars['String']['output'];
  /** The ID of the marketplace app */
  marketplace_app_id: Scalars['ID']['output'];
  metadata: MarketplaceAppMetadata;
  /** The name of the marketplace app */
  name: Scalars['String']['output'];
  /** The short description of the marketplace app */
  short_description: Scalars['String']['output'];
};

export type MarketplaceSearchHit = {
  __typename?: 'MarketplaceSearchHit';
  document: MarketplaceSearchAppDocument;
  /** The unique identifier of the search result */
  id: Scalars['String']['output'];
  /** The relevance score of the search result */
  score: Scalars['Float']['output'];
};

export type MarketplaceSearchInput = {
  /** Maximum number of search results to return */
  limit?: InputMaybe<Scalars['Int']['input']>;
  /** Number of search results to skip */
  offset?: InputMaybe<Scalars['Int']['input']>;
  /** The search query term */
  query: Scalars['String']['input'];
};

export type MarketplaceSearchResults = {
  __typename?: 'MarketplaceSearchResults';
  /** The total number of search results */
  count: Scalars['Int']['output'];
  /** The time taken to perform the search */
  elapsed: Scalars['String']['output'];
  hits: Array<MarketplaceSearchHit>;
};

/** Mention object for user or document references */
export type Mention = {
  __typename?: 'Mention';
  /** The unique identifier of the mentioned entity */
  id?: Maybe<Scalars['Int']['output']>;
  /** The type of the mentioned entity */
  type?: Maybe<DocsMention>;
};

/** Mention object for user or document references */
export type MentionInput = {
  /** The ID of the mentioned user or document */
  id: Scalars['Int']['input'];
  /** The type of mention: user, doc, or board */
  type: DocsMention;
};

export enum MentionType {
  Board = 'Board',
  Project = 'Project',
  Team = 'Team',
  User = 'User'
}

/** Metadata wrapper containing payload information for dependency configuration */
export type MetadataInput = {
  /** The dependency configuration payload containing type and lag settings */
  payload?: InputMaybe<PayloadInput>;
};

export type MirrorValue = ColumnValue & {
  __typename?: 'MirrorValue';
  /** The column that this value belongs to. */
  column: Column;
  /** A string representing all the names of the linked items, separated by commas */
  display_value: Scalars['String']['output'];
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** The mirrored items. */
  mirrored_items: Array<MirroredItem>;
  /** Text representation of the column value. Note: Not all columns support textual value */
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

export type MirroredItem = {
  __typename?: 'MirroredItem';
  /** The linked board. */
  linked_board: Board;
  /** The linked board's unique identifier. */
  linked_board_id: Scalars['ID']['output'];
  /** The linked item. */
  linked_item: Item;
  /** The mirrored values. */
  mirrored_value?: Maybe<MirroredValue>;
};

/** Represents a mirrored value (column value, group, or board). */
export type MirroredValue = BatteryValue | Board | BoardRelationValue | ButtonValue | CheckboxValue | ColorPickerValue | CountryValue | CreationLogValue | DateValue | DependencyValue | DirectDocValue | DocValue | DropdownValue | EmailValue | FileValue | FormulaValue | Group | GroupValue | HourValue | IntegrationValue | ItemIdValue | LastUpdatedValue | LinkValue | LocationValue | LongTextValue | MirrorValue | NumbersValue | PeopleValue | PersonValue | PhoneValue | ProgressValue | RatingValue | StatusValue | SubtasksValue | TagsValue | TeamValue | TextValue | TimeTrackingValue | TimelineValue | UnsupportedValue | VoteValue | WeekValue | WorldClockValue;

/** Root mutation type for the Dependencies service */
export type Mutation = {
  __typename?: 'Mutation';
  /** Activate a form to make it visible to users and accept new submissions. */
  activate_form?: Maybe<Scalars['Boolean']['output']>;
  /** Activate managed column mutation. */
  activate_managed_column?: Maybe<ManagedColumn>;
  /** Activates the specified users. */
  activate_users?: Maybe<ActivateUsersResult>;
  /** Adds markdown content to an existing document by converting it into document blocks. Use this to append content to the end of a document or insert content after a specific block. The markdown will be parsed and converted into the appropriate document block types (text, headers, lists, etc.). Returns the IDs of the newly created blocks on success. */
  add_content_to_doc_from_markdown?: Maybe<DocBlocksFromMarkdownResult>;
  /** Add a file to a column value. */
  add_file_to_column?: Maybe<Asset>;
  /** Add a file to an update. */
  add_file_to_update?: Maybe<Asset>;
  /** Add a required column to a board */
  add_required_column?: Maybe<RequiredColumns>;
  /**
   * Add subscribers to a board.
   * @deprecated use add_users_to_board instead
   */
  add_subscribers_to_board?: Maybe<Array<Maybe<User>>>;
  /** Adds users to an existing object as either subscribers or owners. Subscribers receive notifications about object changes, while owners have full control permissions. Works with any object type including boards, docs, dashboards, workflows, and specialized objects (CRM, capacity manager, etc.). Equivalent to the add_users_to_board mutation in the boards API. */
  add_subscribers_to_object?: Maybe<Object>;
  /** Add teams subscribers to a board. */
  add_teams_to_board?: Maybe<Array<Maybe<Team>>>;
  /** Add teams to a workspace. */
  add_teams_to_workspace?: Maybe<Array<Maybe<Team>>>;
  /** Add subscribers to a board. */
  add_users_to_board?: Maybe<Array<Maybe<User>>>;
  /** Add users to team. */
  add_users_to_team?: Maybe<ChangeTeamMembershipsResult>;
  /** Add users to a workspace. */
  add_users_to_workspace?: Maybe<Array<Maybe<User>>>;
  /** Archive a board. */
  archive_board?: Maybe<Board>;
  /** Archives a group in a specific board. */
  archive_group?: Maybe<Group>;
  /** Archive an item. */
  archive_item?: Maybe<Item>;
  /** Archives an object in the Monday.com Objects Platform, changing its state to "archived" while preserving all data. Archived objects remain in the system but are hidden from regular views. This operation works for any object type including boards, docs, dashboards, workflows, and specialized objects (CRM, capacity manager, etc.). Under the hood, this archives the board that represents this object. */
  archive_object?: Maybe<Object>;
  /** Assigns the specified users as owners of the specified team. */
  assign_team_owners?: Maybe<AssignTeamOwnersResult>;
  /** Extends trial period of an application to selected accounts */
  batch_extend_trial_period?: Maybe<BatchExtendTrialPeriod>;
  /** Initialize bulk import for a board and group. Returns import ID and upload URL to begin the process. */
  bulk_import_items?: Maybe<BulkImportInit>;
  /** Change a column's properties */
  change_column_metadata?: Maybe<Column>;
  /** Change a column's title */
  change_column_title?: Maybe<Column>;
  /** Change an item's column value. */
  change_column_value?: Maybe<Item>;
  /** Change an item's position. */
  change_item_position?: Maybe<Item>;
  /** Changes the column values of a specific item. */
  change_multiple_column_values?: Maybe<Item>;
  /** Change an item's column with simple value. */
  change_simple_column_value?: Maybe<Item>;
  /** Clear an item's updates. */
  clear_item_updates?: Maybe<Item>;
  /** Get the complexity data of your mutations. */
  complexity?: Maybe<Complexity>;
  /** Connect project to portfolio */
  connect_project_to_portfolio?: Maybe<ConnectProjectResult>;
  /** Convert an existing monday.com board into a project with enhanced project management capabilities. This mutation transforms a regular board by applying project-specific features and configurations through column mappings that define how existing board columns should be interpreted in the project context. The conversion process is asynchronous and returns a process_id for tracking completion. Optionally accepts a callback URL for notification when the conversion completes. Use this when you have an existing board with data that needs to be upgraded to a full project with advanced project management features like Resource Planner integration. */
  convert_board_to_project?: Maybe<ConvertBoardToProjectResult>;
  /** Creates a new app with the specified configuration. */
  create_app?: Maybe<AppType>;
  /** Create a new app feature. */
  create_app_feature?: Maybe<AppFeatureType>;
  /** Create a new board. */
  create_board?: Maybe<Board>;
  /** Generic mutation for creating any column type with validation. Supports creating column with properties like title, description, and type-specific defaults/settings. The mutation validates input against the column type's schema before applying changes. Use get_column_type_schema query to understand available properties for each column type. */
  create_column?: Maybe<Column>;
  create_custom_activity?: Maybe<CustomActivity>;
  /** Create a new dashboard. */
  create_dashboard?: Maybe<Dashboard>;
  /** Create a new doc. */
  create_doc?: Maybe<Document>;
  /** Create new document block */
  create_doc_block?: Maybe<DocumentBlock>;
  /** Creates multiple document blocks in a single operation for efficient content creation. Use this when adding substantial content like importing documents, creating structured content (articles, reports, guides), or building complex document sections. Supports all block types including text paragraphs, headers, bullet/numbered lists, images, tables, code blocks, and more. Much faster than creating blocks individually. Perfect for content migration, template creation, or generating documents from external data. Maximum 25 blocks per request. */
  create_doc_blocks?: Maybe<Array<DocumentBlockV2>>;
  /** Creates a new dropdown column with strongly typed settings. Dropdown columns allow users to select from a predefined list of options. This mutation is specifically for dropdown columns and provides type-safe creation with dropdown options configuration. */
  create_dropdown_column?: Maybe<Column>;
  /** Create managed column of type dropdown mutation. */
  create_dropdown_managed_column?: Maybe<DropdownManagedColumn>;
  /** Add workspace object to favorites */
  create_favorite?: Maybe<CreateFavoriteResultType>;
  /** Creates a folder in a specific workspace. */
  create_folder?: Maybe<Folder>;
  /** Create a new form with specified configuration. Returns the created form with its unique token. */
  create_form?: Maybe<DehydratedFormResponse>;
  /** Create a new question within a form. Returns the created question with auto-generated ID. */
  create_form_question?: Maybe<FormQuestion>;
  /** Create a new tag for a form. Tags are used to categorize and track responses. (e.g. UTM tags) */
  create_form_tag?: Maybe<FormTag>;
  /** Creates a new group in a specific board. */
  create_group?: Maybe<Group>;
  /** Create a new item. */
  create_item?: Maybe<Item>;
  /** Create a new notification. */
  create_notification?: Maybe<Notification>;
  /** Creates a new object in the Monday.com Objects Platform. The type of object created is determined by the app_feature_reference_id parameter. This mutation can create boards, docs, dashboards, workflows, or specialized objects like CRM, capacity manager, etc. Under the hood, this creates a board with the specified app_feature_id. */
  create_object?: Maybe<Object>;
  /** Create a new tag or get it if it already exists. */
  create_or_get_tag?: Maybe<Tag>;
  /** Create a new portfolio */
  create_portfolio?: Maybe<CreatePortfolioResult>;
  /** Creates a new status column with strongly typed settings. Status columns allow users to track item progress through customizable labels (e.g., "Working on it", "Done", "Stuck"). This mutation is specifically for status/color columns and provides type-safe creation with label configuration. */
  create_status_column?: Maybe<Column>;
  /** Create managed column of type status mutation. */
  create_status_managed_column?: Maybe<StatusManagedColumn>;
  /** Create subitem. */
  create_subitem?: Maybe<Item>;
  /** Creates a new team. */
  create_team?: Maybe<Team>;
  create_timeline_item?: Maybe<TimelineItem>;
  create_update?: Maybe<Update>;
  /** Create a view */
  create_view?: Maybe<BoardView>;
  /** Create a new table view */
  create_view_table?: Maybe<BoardView>;
  /** Create a new webhook. */
  create_webhook?: Maybe<Webhook>;
  /** Create a new widget. */
  create_widget?: Maybe<Widget>;
  /** Create a new workspace. */
  create_workspace?: Maybe<Workspace>;
  /** Deactivate a form to hide it from users and stop accepting submissions. Form data is preserved. */
  deactivate_form?: Maybe<Scalars['Boolean']['output']>;
  /** Deactivate managed column mutation. */
  deactivate_managed_column?: Maybe<ManagedColumn>;
  /** Deactivates the specified users. */
  deactivate_users?: Maybe<DeactivateUsersResult>;
  /** Delete a board. */
  delete_board?: Maybe<Board>;
  /** Deletes a column from a board. Cannot delete mandatory columns (e.g., name column). */
  delete_column?: Maybe<Column>;
  delete_custom_activity?: Maybe<CustomActivity>;
  /** Delete an existing dashboard. */
  delete_dashboard?: Maybe<Scalars['Boolean']['output']>;
  /** Permanently deletes a document and all its content from the system. This action cannot be undone. The document will be removed from all user views and workspaces. Use with caution - ensure the document is no longer needed before deletion. Returns success status and the deleted document ID. */
  delete_doc?: Maybe<Scalars['JSON']['output']>;
  /** Delete a document block */
  delete_doc_block?: Maybe<DocumentBlockIdOnly>;
  /** Remove an object from favorites */
  delete_favorite?: Maybe<DeleteFavoriteInputResultType>;
  /** Deletes a folder in a specific workspace. */
  delete_folder?: Maybe<Folder>;
  /** Delete a tag from a form */
  delete_form_tag?: Maybe<Scalars['Boolean']['output']>;
  /** Deletes a group in a specific board. */
  delete_group?: Maybe<Group>;
  /** Delete an item. */
  delete_item?: Maybe<Item>;
  /** Delete managed column mutation. */
  delete_managed_column?: Maybe<ManagedColumn>;
  delete_marketplace_app_discount: DeleteMarketplaceAppDiscountResult;
  /** Permanently deletes an object from the Monday.com Objects Platform. Unlike archiving, deletion is only reversible for 30 days and removes all associated data. This operation works for any object type including boards, docs, dashboards, workflows, and specialized objects (CRM, capacity manager, etc.). WARNING: This operation cannot be undone after 30 days. */
  delete_object?: Maybe<Object>;
  /** Permanently remove a question from a form. This action cannot be undone. */
  delete_question?: Maybe<Scalars['Boolean']['output']>;
  /** Remove subscribers from the board. */
  delete_subscribers_from_board?: Maybe<Array<Maybe<User>>>;
  /** Deletes the specified team. */
  delete_team?: Maybe<Team>;
  /** Remove team subscribers from the board. */
  delete_teams_from_board?: Maybe<Array<Maybe<Team>>>;
  /** Delete teams from a workspace. */
  delete_teams_from_workspace?: Maybe<Array<Maybe<Team>>>;
  delete_timeline_item?: Maybe<TimelineItem>;
  delete_update?: Maybe<Update>;
  /** Delete users from a workspace. */
  delete_users_from_workspace?: Maybe<Array<Maybe<User>>>;
  /** Delete an existing board subset/view */
  delete_view?: Maybe<BoardView>;
  /** Delete a new webhook. */
  delete_webhook?: Maybe<Webhook>;
  /** Delete an existing widget. */
  delete_widget?: Maybe<Scalars['Boolean']['output']>;
  /** Delete workspace. */
  delete_workspace?: Maybe<Workspace>;
  /** Duplicate a board. */
  duplicate_board?: Maybe<BoardDuplication>;
  /** Creates an exact copy of an existing document, including all content, structure, and formatting. Use this to create templates, backup documents before major changes, or create variations of existing documents. The duplicated document will have a new unique ID and can be modified independently. Returns the new document's ID on success. */
  duplicate_doc?: Maybe<Scalars['JSON']['output']>;
  /** Duplicate a group. */
  duplicate_group?: Maybe<Group>;
  /** Duplicate an item. */
  duplicate_item?: Maybe<Item>;
  edit_update: Update;
  grant_marketplace_app_discount: GrantMarketplaceAppDiscountResult;
  /** Imports HTML content as a new document by converting it into document blocks. The HTML will be parsed and converted into the appropriate document block types (text, headers, lists, etc.). Returns the ID of the newly created document on success. */
  import_doc_from_html?: Maybe<ImportDocFromHtmlResult>;
  /** Increase operations counter */
  increase_app_subscription_operations?: Maybe<AppSubscriptionOperationsCounter>;
  /** Invite users to the account. */
  invite_users?: Maybe<InviteUsersResult>;
  like_update?: Maybe<Update>;
  /** Move an item to a different board. */
  move_item_to_board?: Maybe<Item>;
  /** Move an item to a different group. */
  move_item_to_group?: Maybe<Item>;
  pin_to_top: Update;
  /** Publishes object out of draft state. Returns {success: true} on success, {success: false} on failure. */
  publish_object?: Maybe<ObjectOperationResponse>;
  /** Remove mock app subscription for the current account */
  remove_mock_app_subscription?: Maybe<AppSubscription>;
  /** Remove a required column from a board */
  remove_required_column?: Maybe<RequiredColumns>;
  /** Removes the specified users as owners of the specified team. */
  remove_team_owners?: Maybe<RemoveTeamOwnersResult>;
  /** Remove users from team. */
  remove_users_from_team?: Maybe<ChangeTeamMembershipsResult>;
  /**
   * Set or update the board's permission to specified role. This concept is also
   * known as default board role, general access or board permission set.
   */
  set_board_permission?: Maybe<SetBoardPermissionResponse>;
  /** Set a password on a form to restrict access. This will enable password protection for the form. */
  set_form_password?: Maybe<ResponseForm>;
  /** Set mock app subscription for the current account */
  set_mock_app_subscription?: Maybe<AppSubscription>;
  /** Shorten a URL for a form and store it in the form settings. Returns the shortened link object. */
  shorten_form_url?: Maybe<FormShortenedLink>;
  unlike_update: Update;
  unpin_from_top: Update;
  /** Unpublishes object from public state back to draft state. Returns {success: true} on success, {success: false} on failure. */
  unpublish_object?: Maybe<ObjectOperationResponse>;
  /** Updates an existing app. If the app latest version is live, a new draft version is automatically created and updated. */
  update_app?: Maybe<AppType>;
  /** Update an app feature. */
  update_app_feature?: Maybe<AppFeatureType>;
  /** Updates the content of a specific article block. The block must belong to a draft article that the user has permission to edit. Cannot update blocks of published articles. */
  update_article_block?: Maybe<ArticleBlock>;
  /** Update item column value by existing assets */
  update_assets_on_item?: Maybe<Item>;
  /** Update Board attribute. */
  update_board?: Maybe<Scalars['JSON']['output']>;
  /** Update a board's position, workspace, or account product. */
  update_board_hierarchy?: Maybe<UpdateBoardHierarchyResult>;
  /** Generic mutation for updating any column type with validation. Supports updating column properties like title, description, and type-specific defaults/settings. The mutation validates input against the column type's schema before applying changes. Use get_column_type_schema query to understand available properties for each column type. */
  update_column?: Maybe<Column>;
  /** Update an existing dashboard. */
  update_dashboard?: Maybe<Dashboard>;
  /** Update the dependency column for a specific pulse */
  update_dependency_column: Scalars['JSON']['output'];
  /** Update a document block */
  update_doc_block?: Maybe<DocumentBlock>;
  /** Update a document's name/title. Changes are applied immediately and visible to all users with access to the document. */
  update_doc_name?: Maybe<Scalars['JSON']['output']>;
  /** Updates a dropdown column's properties including title, description, and dropdown label settings. Dropdown columns allow users to select from a predefined list of options. This mutation is specifically for dropdown columns and provides type-safe updates. */
  update_dropdown_column?: Maybe<Column>;
  /** Update managed column of type dropdown mutation. */
  update_dropdown_managed_column?: Maybe<DropdownManagedColumn>;
  /** Updates the email domain for the specified users. */
  update_email_domain?: Maybe<UpdateEmailDomainResult>;
  /** Update the position of an object in favorites */
  update_favorite_position?: Maybe<UpdateFavoriteResultType>;
  /** Updates a folder. */
  update_folder?: Maybe<Folder>;
  /** Update form properties including title, description, or question order. */
  update_form?: Maybe<ResponseForm>;
  /** Update an existing question properties including title, type, or settings. Requires question ID. */
  update_form_question?: Maybe<FormQuestion>;
  /** Update form configuration including features, appearance, and accessibility options. */
  update_form_settings?: Maybe<ResponseForm>;
  /** Update an existing tag in a form */
  update_form_tag?: Maybe<Scalars['Boolean']['output']>;
  /** Update an existing group. */
  update_group?: Maybe<Group>;
  /** Updates attributes for users. */
  update_multiple_users?: Maybe<UpdateUserAttributesResult>;
  /** Update mute notification settings for a board. Allows muting all notifications for all users, only for the current user, or setting mentions/assigns-only. Returns the updated mute state for the board. Requires appropriate permissions for muting all users. */
  update_mute_board_settings?: Maybe<Array<BoardMuteSettings>>;
  /** Updates a notification setting's enabled status. */
  update_notification_setting?: Maybe<Array<NotificationSetting>>;
  /** Updates an object. */
  update_object?: Maybe<Object>;
  /** Update the position of a dashboard. */
  update_overview_hierarchy?: Maybe<UpdateOverviewHierarchy>;
  /** Updates a status column's properties including title, description, and status label settings. Status columns allow users to track item progress through customizable labels (e.g., "Working on it", "Done", "Stuck"). This mutation is specifically for status/color columns and provides type-safe updates. */
  update_status_column?: Maybe<Column>;
  /** Update managed column of type status mutation. */
  update_status_managed_column?: Maybe<StatusManagedColumn>;
  /** Updates the role of the specified users. */
  update_users_role?: Maybe<UpdateUsersRoleResult>;
  /** Update an existing view */
  update_view?: Maybe<BoardView>;
  /** Update an existing board table view */
  update_view_table?: Maybe<BoardView>;
  /** Update an existing workspace. */
  update_workspace?: Maybe<Workspace>;
  /** Use a template */
  use_template?: Maybe<Template>;
};


/** Root mutation type for the Dependencies service */
export type MutationActivate_FormArgs = {
  formToken: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationActivate_Managed_ColumnArgs = {
  id: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationActivate_UsersArgs = {
  user_ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationAdd_Content_To_Doc_From_MarkdownArgs = {
  afterBlockId?: InputMaybe<Scalars['String']['input']>;
  docId: Scalars['ID']['input'];
  markdown: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationAdd_File_To_ColumnArgs = {
  column_id: Scalars['String']['input'];
  file: Scalars['File']['input'];
  item_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationAdd_File_To_UpdateArgs = {
  file: Scalars['File']['input'];
  update_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationAdd_Required_ColumnArgs = {
  column_id: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  type?: InputMaybe<ValidationsEntityType>;
};


/** Root mutation type for the Dependencies service */
export type MutationAdd_Subscribers_To_BoardArgs = {
  board_id: Scalars['ID']['input'];
  kind?: InputMaybe<BoardSubscriberKind>;
  user_ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationAdd_Subscribers_To_ObjectArgs = {
  id: Scalars['ID']['input'];
  kind?: InputMaybe<SubscriberKind>;
  user_ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationAdd_Teams_To_BoardArgs = {
  board_id: Scalars['ID']['input'];
  kind?: InputMaybe<BoardSubscriberKind>;
  team_ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationAdd_Teams_To_WorkspaceArgs = {
  kind?: InputMaybe<WorkspaceSubscriberKind>;
  team_ids: Array<Scalars['ID']['input']>;
  workspace_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationAdd_Users_To_BoardArgs = {
  board_id: Scalars['ID']['input'];
  kind?: InputMaybe<BoardSubscriberKind>;
  user_ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationAdd_Users_To_TeamArgs = {
  team_id: Scalars['ID']['input'];
  user_ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationAdd_Users_To_WorkspaceArgs = {
  kind?: InputMaybe<WorkspaceSubscriberKind>;
  user_ids: Array<Scalars['ID']['input']>;
  workspace_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationArchive_BoardArgs = {
  board_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationArchive_GroupArgs = {
  board_id: Scalars['ID']['input'];
  group_id: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationArchive_ItemArgs = {
  item_id?: InputMaybe<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationArchive_ObjectArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationAssign_Team_OwnersArgs = {
  team_id: Scalars['ID']['input'];
  user_ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationBatch_Extend_Trial_PeriodArgs = {
  account_slugs: Array<Scalars['String']['input']>;
  app_id: Scalars['ID']['input'];
  duration_in_days: Scalars['Int']['input'];
  plan_id: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationBulk_Import_ItemsArgs = {
  board_id: Scalars['ID']['input'];
  group_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationChange_Column_MetadataArgs = {
  board_id: Scalars['ID']['input'];
  column_id: Scalars['String']['input'];
  column_property?: InputMaybe<ColumnProperty>;
  value?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationChange_Column_TitleArgs = {
  board_id: Scalars['ID']['input'];
  column_id: Scalars['String']['input'];
  title: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationChange_Column_ValueArgs = {
  board_id: Scalars['ID']['input'];
  column_id: Scalars['String']['input'];
  create_labels_if_missing?: InputMaybe<Scalars['Boolean']['input']>;
  item_id?: InputMaybe<Scalars['ID']['input']>;
  value: Scalars['JSON']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationChange_Item_PositionArgs = {
  group_id?: InputMaybe<Scalars['ID']['input']>;
  group_top?: InputMaybe<Scalars['Boolean']['input']>;
  item_id: Scalars['ID']['input'];
  position_relative_method?: InputMaybe<PositionRelative>;
  relative_to?: InputMaybe<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationChange_Multiple_Column_ValuesArgs = {
  board_id: Scalars['ID']['input'];
  column_values: Scalars['JSON']['input'];
  create_labels_if_missing?: InputMaybe<Scalars['Boolean']['input']>;
  item_id?: InputMaybe<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationChange_Simple_Column_ValueArgs = {
  board_id: Scalars['ID']['input'];
  column_id: Scalars['String']['input'];
  create_labels_if_missing?: InputMaybe<Scalars['Boolean']['input']>;
  item_id?: InputMaybe<Scalars['ID']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationClear_Item_UpdatesArgs = {
  item_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationConnect_Project_To_PortfolioArgs = {
  portfolioBoardId: Scalars['ID']['input'];
  projectBoardId: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationConvert_Board_To_ProjectArgs = {
  input: ConvertBoardToProjectInput;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_AppArgs = {
  input: CreateAppInput;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_App_FeatureArgs = {
  app_id: Scalars['ID']['input'];
  app_version_id?: InputMaybe<Scalars['ID']['input']>;
  data?: InputMaybe<Scalars['JSON']['input']>;
  deployment?: InputMaybe<AppFeatureReleaseInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  slug: Scalars['String']['input'];
  type: AppFeatureTypeE;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_BoardArgs = {
  board_kind: BoardKind;
  board_name: Scalars['String']['input'];
  board_owner_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  board_owner_team_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  board_subscriber_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  board_subscriber_teams_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  description?: InputMaybe<Scalars['String']['input']>;
  empty?: InputMaybe<Scalars['Boolean']['input']>;
  folder_id?: InputMaybe<Scalars['ID']['input']>;
  item_nickname?: InputMaybe<ItemNicknameInput>;
  template_id?: InputMaybe<Scalars['ID']['input']>;
  workspace_id?: InputMaybe<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_ColumnArgs = {
  after_column_id?: InputMaybe<Scalars['ID']['input']>;
  board_id: Scalars['ID']['input'];
  capabilities?: InputMaybe<ColumnCapabilitiesInput>;
  column_type: ColumnType;
  defaults?: InputMaybe<Scalars['JSON']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_Custom_ActivityArgs = {
  color: CustomActivityColor;
  icon_id: CustomActivityIcon;
  name: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_DashboardArgs = {
  board_folder_id?: InputMaybe<Scalars['ID']['input']>;
  board_ids: Array<Scalars['ID']['input']>;
  kind?: InputMaybe<DashboardKind>;
  name: Scalars['String']['input'];
  workspace_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_DocArgs = {
  location: CreateDocInput;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_Doc_BlockArgs = {
  after_block_id?: InputMaybe<Scalars['String']['input']>;
  content: Scalars['JSON']['input'];
  doc_id: Scalars['ID']['input'];
  parent_block_id?: InputMaybe<Scalars['String']['input']>;
  type: DocBlockContentType;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_Doc_BlocksArgs = {
  afterBlockId?: InputMaybe<Scalars['String']['input']>;
  blocksInput: Array<CreateBlockInput>;
  docId: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_Dropdown_ColumnArgs = {
  after_column_id?: InputMaybe<Scalars['ID']['input']>;
  board_id: Scalars['ID']['input'];
  defaults?: InputMaybe<CreateDropdownColumnSettingsInput>;
  description?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_Dropdown_Managed_ColumnArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  settings?: InputMaybe<CreateDropdownColumnSettingsInput>;
  title: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_FavoriteArgs = {
  input: CreateFavoriteInput;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_FolderArgs = {
  color?: InputMaybe<FolderColor>;
  custom_icon?: InputMaybe<FolderCustomIcon>;
  font_weight?: InputMaybe<FolderFontWeight>;
  name: Scalars['String']['input'];
  parent_folder_id?: InputMaybe<Scalars['ID']['input']>;
  workspace_id?: InputMaybe<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_FormArgs = {
  board_kind?: InputMaybe<BoardKind>;
  board_owner_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  board_owner_team_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  board_subscriber_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  board_subscriber_teams_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  destination_folder_id?: InputMaybe<Scalars['ID']['input']>;
  destination_folder_name?: InputMaybe<Scalars['String']['input']>;
  destination_name?: InputMaybe<Scalars['String']['input']>;
  destination_workspace_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_Form_QuestionArgs = {
  formToken: Scalars['String']['input'];
  question: CreateQuestionInput;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_Form_TagArgs = {
  formToken: Scalars['String']['input'];
  tag: CreateFormTagInput;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_GroupArgs = {
  board_id: Scalars['ID']['input'];
  group_color?: InputMaybe<Scalars['String']['input']>;
  group_name: Scalars['String']['input'];
  position?: InputMaybe<Scalars['String']['input']>;
  position_relative_method?: InputMaybe<PositionRelative>;
  relative_to?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_ItemArgs = {
  board_id: Scalars['ID']['input'];
  column_values?: InputMaybe<Scalars['JSON']['input']>;
  create_labels_if_missing?: InputMaybe<Scalars['Boolean']['input']>;
  group_id?: InputMaybe<Scalars['String']['input']>;
  item_name: Scalars['String']['input'];
  position_relative_method?: InputMaybe<PositionRelative>;
  relative_to?: InputMaybe<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_NotificationArgs = {
  target_id: Scalars['ID']['input'];
  target_type: NotificationTargetType;
  text: Scalars['String']['input'];
  user_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_ObjectArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  folder_id?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
  object_type_unique_key: Scalars['String']['input'];
  owner_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  owner_team_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  payload?: InputMaybe<Scalars['JSON']['input']>;
  privacy_kind: PrivacyKind;
  subscriber_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  subscriber_teams_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  workspace_id?: InputMaybe<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_Or_Get_TagArgs = {
  board_id?: InputMaybe<Scalars['ID']['input']>;
  tag_name?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_PortfolioArgs = {
  boardName: Scalars['String']['input'];
  boardPrivacy: Scalars['String']['input'];
  destinationWorkspaceId?: InputMaybe<Scalars['Int']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_Status_ColumnArgs = {
  after_column_id?: InputMaybe<Scalars['ID']['input']>;
  board_id: Scalars['ID']['input'];
  capabilities?: InputMaybe<StatusColumnCapabilitiesInput>;
  defaults?: InputMaybe<CreateStatusColumnSettingsInput>;
  description?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_Status_Managed_ColumnArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  settings?: InputMaybe<CreateStatusColumnSettingsInput>;
  title: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_SubitemArgs = {
  column_values?: InputMaybe<Scalars['JSON']['input']>;
  create_labels_if_missing?: InputMaybe<Scalars['Boolean']['input']>;
  item_name: Scalars['String']['input'];
  parent_item_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_TeamArgs = {
  input: CreateTeamAttributesInput;
  options?: InputMaybe<CreateTeamOptionsInput>;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_Timeline_ItemArgs = {
  content?: InputMaybe<Scalars['String']['input']>;
  custom_activity_id: Scalars['String']['input'];
  item_id: Scalars['ID']['input'];
  location?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  summary?: InputMaybe<Scalars['String']['input']>;
  time_range?: InputMaybe<TimelineItemTimeRange>;
  timestamp: Scalars['ISO8601DateTime']['input'];
  title: Scalars['String']['input'];
  url?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['Int']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_UpdateArgs = {
  body: Scalars['String']['input'];
  item_id?: InputMaybe<Scalars['ID']['input']>;
  mentions_list?: InputMaybe<Array<InputMaybe<UpdateMention>>>;
  original_creation_date?: InputMaybe<Scalars['String']['input']>;
  parent_id?: InputMaybe<Scalars['ID']['input']>;
  use_app_info?: InputMaybe<Scalars['Boolean']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_ViewArgs = {
  board_id: Scalars['ID']['input'];
  filter?: InputMaybe<ItemsQueryGroup>;
  filter_team_id?: InputMaybe<Scalars['ID']['input']>;
  filter_user_id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  settings?: InputMaybe<Scalars['JSON']['input']>;
  sort?: InputMaybe<Array<ItemsQueryOrderBy>>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  type: ViewKind;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_View_TableArgs = {
  board_id: Scalars['ID']['input'];
  filter?: InputMaybe<ItemsQueryGroup>;
  filter_team_id?: InputMaybe<Scalars['ID']['input']>;
  filter_user_id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  settings?: InputMaybe<TableViewSettingsInput>;
  sort?: InputMaybe<Array<ItemsQueryOrderBy>>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_WebhookArgs = {
  board_id: Scalars['ID']['input'];
  config?: InputMaybe<Scalars['JSON']['input']>;
  event: WebhookEventType;
  url: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_WidgetArgs = {
  filter?: InputMaybe<ItemsQueryGroup>;
  kind: ExternalWidget;
  name: Scalars['String']['input'];
  parent: WidgetParentInput;
  settings: Scalars['JSON']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationCreate_WorkspaceArgs = {
  account_product_id?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  kind: WorkspaceKind;
  name: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDeactivate_FormArgs = {
  formToken: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDeactivate_Managed_ColumnArgs = {
  id: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDeactivate_UsersArgs = {
  user_ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_BoardArgs = {
  board_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_ColumnArgs = {
  board_id: Scalars['ID']['input'];
  column_id: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_Custom_ActivityArgs = {
  id: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_DashboardArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_DocArgs = {
  docId: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_Doc_BlockArgs = {
  block_id: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_FavoriteArgs = {
  input: DeleteFavoriteInput;
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_FolderArgs = {
  folder_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_Form_TagArgs = {
  formToken: Scalars['String']['input'];
  options?: InputMaybe<DeleteFormTagInput>;
  tagId: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_GroupArgs = {
  board_id: Scalars['ID']['input'];
  group_id: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_ItemArgs = {
  item_id?: InputMaybe<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_Managed_ColumnArgs = {
  id: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_Marketplace_App_DiscountArgs = {
  account_slug: Scalars['String']['input'];
  app_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_ObjectArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_QuestionArgs = {
  formToken: Scalars['String']['input'];
  questionId: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_Subscribers_From_BoardArgs = {
  board_id: Scalars['ID']['input'];
  user_ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_TeamArgs = {
  team_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_Teams_From_BoardArgs = {
  board_id: Scalars['ID']['input'];
  team_ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_Teams_From_WorkspaceArgs = {
  team_ids: Array<Scalars['ID']['input']>;
  workspace_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_Timeline_ItemArgs = {
  id: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_UpdateArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_Users_From_WorkspaceArgs = {
  user_ids: Array<Scalars['ID']['input']>;
  workspace_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_ViewArgs = {
  board_id: Scalars['ID']['input'];
  view_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_WebhookArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_WidgetArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDelete_WorkspaceArgs = {
  workspace_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationDuplicate_BoardArgs = {
  board_id: Scalars['ID']['input'];
  board_name?: InputMaybe<Scalars['String']['input']>;
  duplicate_type: DuplicateBoardType;
  folder_id?: InputMaybe<Scalars['ID']['input']>;
  keep_subscribers?: InputMaybe<Scalars['Boolean']['input']>;
  workspace_id?: InputMaybe<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationDuplicate_DocArgs = {
  docId: Scalars['ID']['input'];
  duplicateType?: InputMaybe<DuplicateType>;
};


/** Root mutation type for the Dependencies service */
export type MutationDuplicate_GroupArgs = {
  add_to_top?: InputMaybe<Scalars['Boolean']['input']>;
  board_id: Scalars['ID']['input'];
  group_id: Scalars['String']['input'];
  group_title?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationDuplicate_ItemArgs = {
  board_id: Scalars['ID']['input'];
  item_id?: InputMaybe<Scalars['ID']['input']>;
  with_updates?: InputMaybe<Scalars['Boolean']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationEdit_UpdateArgs = {
  body: Scalars['String']['input'];
  id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationGrant_Marketplace_App_DiscountArgs = {
  account_slug: Scalars['String']['input'];
  app_id: Scalars['ID']['input'];
  data: GrantMarketplaceAppDiscountData;
};


/** Root mutation type for the Dependencies service */
export type MutationImport_Doc_From_HtmlArgs = {
  folderId?: InputMaybe<Scalars['ID']['input']>;
  html: Scalars['String']['input'];
  kind?: InputMaybe<DocKind>;
  title?: InputMaybe<Scalars['String']['input']>;
  workspaceId: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationIncrease_App_Subscription_OperationsArgs = {
  increment_by?: InputMaybe<Scalars['Int']['input']>;
  kind?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationInvite_UsersArgs = {
  emails: Array<Scalars['String']['input']>;
  product?: InputMaybe<Product>;
  user_role?: InputMaybe<UserRole>;
};


/** Root mutation type for the Dependencies service */
export type MutationLike_UpdateArgs = {
  reaction_type?: InputMaybe<Scalars['String']['input']>;
  update_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationMove_Item_To_BoardArgs = {
  board_id: Scalars['ID']['input'];
  columns_mapping?: InputMaybe<Array<ColumnMappingInput>>;
  group_id: Scalars['ID']['input'];
  item_id: Scalars['ID']['input'];
  subitems_columns_mapping?: InputMaybe<Array<ColumnMappingInput>>;
};


/** Root mutation type for the Dependencies service */
export type MutationMove_Item_To_GroupArgs = {
  group_id: Scalars['String']['input'];
  item_id?: InputMaybe<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationPin_To_TopArgs = {
  id: Scalars['ID']['input'];
  item_id?: InputMaybe<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationPublish_ObjectArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationRemove_Mock_App_SubscriptionArgs = {
  app_id: Scalars['ID']['input'];
  partial_signing_secret: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationRemove_Required_ColumnArgs = {
  column_id: Scalars['String']['input'];
  id: Scalars['ID']['input'];
  type?: InputMaybe<ValidationsEntityType>;
};


/** Root mutation type for the Dependencies service */
export type MutationRemove_Team_OwnersArgs = {
  team_id: Scalars['ID']['input'];
  user_ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationRemove_Users_From_TeamArgs = {
  team_id: Scalars['ID']['input'];
  user_ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationSet_Board_PermissionArgs = {
  basic_role_name: BoardBasicRoleName;
  board_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationSet_Form_PasswordArgs = {
  formToken: Scalars['String']['input'];
  input: SetFormPasswordInput;
};


/** Root mutation type for the Dependencies service */
export type MutationSet_Mock_App_SubscriptionArgs = {
  app_id: Scalars['ID']['input'];
  billing_period?: InputMaybe<Scalars['String']['input']>;
  is_trial?: InputMaybe<Scalars['Boolean']['input']>;
  max_units?: InputMaybe<Scalars['Int']['input']>;
  partial_signing_secret: Scalars['String']['input'];
  plan_id?: InputMaybe<Scalars['String']['input']>;
  pricing_version?: InputMaybe<Scalars['Int']['input']>;
  renewal_date?: InputMaybe<Scalars['Date']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationShorten_Form_UrlArgs = {
  formToken: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationUnlike_UpdateArgs = {
  update_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationUnpin_From_TopArgs = {
  id: Scalars['ID']['input'];
  item_id?: InputMaybe<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationUnpublish_ObjectArgs = {
  id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_AppArgs = {
  id: Scalars['ID']['input'];
  input: UpdateAppInput;
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_App_FeatureArgs = {
  id: Scalars['ID']['input'];
  input: UpdateAppFeatureInput;
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Article_BlockArgs = {
  block_id: Scalars['String']['input'];
  content: Scalars['JSON']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Assets_On_ItemArgs = {
  board_id: Scalars['ID']['input'];
  column_id: Scalars['String']['input'];
  files: Array<FileInput>;
  item_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_BoardArgs = {
  board_attribute: BoardAttributes;
  board_id: Scalars['ID']['input'];
  new_value: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Board_HierarchyArgs = {
  attributes: UpdateBoardHierarchyAttributesInput;
  board_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_ColumnArgs = {
  board_id: Scalars['ID']['input'];
  capabilities?: InputMaybe<ColumnCapabilitiesInput>;
  column_type: ColumnType;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  revision: Scalars['String']['input'];
  settings?: InputMaybe<Scalars['JSON']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_DashboardArgs = {
  board_folder_id?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
  kind?: InputMaybe<DashboardKind>;
  name?: InputMaybe<Scalars['String']['input']>;
  workspace_id?: InputMaybe<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Dependency_ColumnArgs = {
  boardId: Scalars['String']['input'];
  columnId: Scalars['String']['input'];
  pulseId: Scalars['String']['input'];
  value: DependencyValueInput;
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Doc_BlockArgs = {
  block_id: Scalars['String']['input'];
  content: Scalars['JSON']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Doc_NameArgs = {
  docId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Dropdown_ColumnArgs = {
  board_id: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  revision: Scalars['String']['input'];
  settings?: InputMaybe<UpdateDropdownColumnSettingsInput>;
  title?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Dropdown_Managed_ColumnArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  revision: Scalars['Int']['input'];
  settings?: InputMaybe<UpdateDropdownColumnSettingsInput>;
  title?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Email_DomainArgs = {
  input: UpdateEmailDomainAttributesInput;
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Favorite_PositionArgs = {
  input: UpdateObjectHierarchyPositionInput;
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_FolderArgs = {
  account_product_id?: InputMaybe<Scalars['ID']['input']>;
  color?: InputMaybe<FolderColor>;
  custom_icon?: InputMaybe<FolderCustomIcon>;
  folder_id: Scalars['ID']['input'];
  font_weight?: InputMaybe<FolderFontWeight>;
  name?: InputMaybe<Scalars['String']['input']>;
  parent_folder_id?: InputMaybe<Scalars['ID']['input']>;
  position?: InputMaybe<DynamicPosition>;
  workspace_id?: InputMaybe<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_FormArgs = {
  formToken: Scalars['String']['input'];
  input: UpdateFormInput;
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Form_QuestionArgs = {
  formToken: Scalars['String']['input'];
  question: UpdateQuestionInput;
  questionId: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Form_SettingsArgs = {
  formToken: Scalars['String']['input'];
  settings: UpdateFormSettingsInput;
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Form_TagArgs = {
  formToken: Scalars['String']['input'];
  tag: UpdateFormTagInput;
  tagId: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_GroupArgs = {
  board_id: Scalars['ID']['input'];
  group_attribute: GroupAttributes;
  group_id: Scalars['String']['input'];
  new_value: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Multiple_UsersArgs = {
  bypass_confirmation_for_claimed_domains?: InputMaybe<Scalars['Boolean']['input']>;
  use_async_mode?: InputMaybe<Scalars['Boolean']['input']>;
  user_updates: Array<UserUpdateInput>;
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Mute_Board_SettingsArgs = {
  board_id: Scalars['String']['input'];
  enabled?: InputMaybe<Array<CustomizableBoardSettings>>;
  mute_state: BoardMuteState;
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Notification_SettingArgs = {
  channel: ChannelType;
  enabled: Scalars['Boolean']['input'];
  scope_id?: InputMaybe<Scalars['Int']['input']>;
  scope_type: ScopeType;
  setting_kind: Scalars['String']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_ObjectArgs = {
  id: Scalars['String']['input'];
  input: UpdateObjectInput;
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Overview_HierarchyArgs = {
  attributes: UpdateOverviewHierarchyAttributesInput;
  overview_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Status_ColumnArgs = {
  board_id: Scalars['ID']['input'];
  capabilities?: InputMaybe<StatusColumnCapabilitiesInput>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  revision: Scalars['String']['input'];
  settings?: InputMaybe<UpdateStatusColumnSettingsInput>;
  title?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Status_Managed_ColumnArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  revision: Scalars['Int']['input'];
  settings?: InputMaybe<UpdateStatusColumnSettingsInput>;
  title?: InputMaybe<Scalars['String']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_Users_RoleArgs = {
  new_role?: InputMaybe<BaseRoleName>;
  role_id?: InputMaybe<Scalars['ID']['input']>;
  user_ids: Array<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_ViewArgs = {
  board_id: Scalars['ID']['input'];
  filter?: InputMaybe<ItemsQueryGroup>;
  filter_team_id?: InputMaybe<Scalars['ID']['input']>;
  filter_user_id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  settings?: InputMaybe<Scalars['JSON']['input']>;
  sort?: InputMaybe<Array<ItemsQueryOrderBy>>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  type: ViewKind;
  view_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_View_TableArgs = {
  board_id: Scalars['ID']['input'];
  filter?: InputMaybe<ItemsQueryGroup>;
  filter_team_id?: InputMaybe<Scalars['ID']['input']>;
  filter_user_id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  settings?: InputMaybe<TableViewSettingsInput>;
  sort?: InputMaybe<Array<ItemsQueryOrderBy>>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  view_id: Scalars['ID']['input'];
};


/** Root mutation type for the Dependencies service */
export type MutationUpdate_WorkspaceArgs = {
  attributes: UpdateWorkspaceAttributesInput;
  id?: InputMaybe<Scalars['ID']['input']>;
};


/** Root mutation type for the Dependencies service */
export type MutationUse_TemplateArgs = {
  board_kind?: InputMaybe<BoardKind>;
  board_owner_ids?: InputMaybe<Array<InputMaybe<Scalars['Int']['input']>>>;
  board_owner_team_ids?: InputMaybe<Array<InputMaybe<Scalars['Int']['input']>>>;
  board_subscriber_ids?: InputMaybe<Array<InputMaybe<Scalars['Int']['input']>>>;
  board_subscriber_teams_ids?: InputMaybe<Array<InputMaybe<Scalars['Int']['input']>>>;
  callback_url_on_complete?: InputMaybe<Scalars['String']['input']>;
  destination_folder_id?: InputMaybe<Scalars['Int']['input']>;
  destination_folder_name?: InputMaybe<Scalars['String']['input']>;
  destination_name?: InputMaybe<Scalars['String']['input']>;
  destination_workspace_id?: InputMaybe<Scalars['Int']['input']>;
  skip_target_folder_creation?: InputMaybe<Scalars['Boolean']['input']>;
  solution_extra_options?: InputMaybe<Scalars['JSON']['input']>;
  template_id: Scalars['Int']['input'];
};

/** The notice-box's own ID must be captured.  Every block that should appear inside it must be created with parentBlockId = that ID (and can still use afterBlockId for ordering among siblings). */
export type NoticeBoxBlockInput = {
  /** The parent block id to append the created block under. */
  parent_block_id?: InputMaybe<Scalars['String']['input']>;
  theme: NoticeBoxTheme;
};

/** Content for a notice box block */
export type NoticeBoxContent = DocBaseBlockContent & {
  __typename?: 'NoticeBoxContent';
  /** The alignment of the block content */
  alignment?: Maybe<BlockAlignment>;
  /** The text direction of the block content */
  direction?: Maybe<BlockDirection>;
  /** The theme of the notice box */
  theme: NoticeBoxTheme;
};

/** Theme options for notice box blocks */
export enum NoticeBoxTheme {
  General = 'GENERAL',
  Info = 'INFO',
  Tips = 'TIPS',
  Warning = 'WARNING'
}

/** A notification. */
export type Notification = {
  __typename?: 'Notification';
  /** The notification's unique identifier. */
  id: Scalars['ID']['output'];
  /** The notification text. */
  text?: Maybe<Scalars['String']['output']>;
};

/** Represents notification settings configuration */
export type NotificationSetting = {
  __typename?: 'NotificationSetting';
  /** Available notification channels for this setting */
  channels: Array<NotificationSettingChannel>;
  /** Description of the notification setting */
  description?: Maybe<Scalars['String']['output']>;
  /** Whether this setting is only configurable by admins */
  is_for_admins_only?: Maybe<Scalars['Boolean']['output']>;
  /** Whether this setting is not applicable for guest users */
  is_for_non_guests_only?: Maybe<Scalars['Boolean']['output']>;
  /** Notification setting kind */
  kind?: Maybe<Scalars['String']['output']>;
};

/** Represents a notification channel configuration */
export type NotificationSettingChannel = {
  __typename?: 'NotificationSettingChannel';
  /** Whether or not this channel settings is editable */
  editable_status?: Maybe<ChannelEditableStatus>;
  /** Whether notifications are enabled for this channel */
  enabled?: Maybe<Scalars['Boolean']['output']>;
  /** Notification channel destination: Monday, Email, Slack */
  name?: Maybe<ChannelType>;
};

/** The notification's target type. */
export enum NotificationTargetType {
  /** Update */
  Post = 'Post',
  /** Item or Board. */
  Project = 'Project'
}

/** A notification. */
export type NotificationV2 = {
  __typename?: 'NotificationV2';
  /** The board that is associated with the notification. */
  board?: Maybe<Board>;
  /** The date and time the notification was created. */
  created_at?: Maybe<Scalars['Date']['output']>;
  /** The users who created the notification. */
  creators: Array<User>;
  /** The unique identifier of the notification. */
  id: Scalars['ID']['output'];
  /** The item that is associated with the notification. */
  item?: Maybe<Item>;
  /** Whether the notification has been read. */
  read: Scalars['Boolean']['output'];
  /** The text content of the notification. */
  text?: Maybe<Scalars['String']['output']>;
  /** The title of the notification. */
  title?: Maybe<Scalars['String']['output']>;
  /** The update that triggered the notification. */
  update?: Maybe<Update>;
};

/** Indicates where the unit symbol should be placed in a number value */
export enum NumberValueUnitDirection {
  /** The symbol is placed on the left of the number */
  Left = 'left',
  /** The symbol is placed on the right of the number */
  Right = 'right'
}

export type NumbersValue = ColumnValue & {
  __typename?: 'NumbersValue';
  /** The column that this value belongs to. */
  column: Column;
  /** Indicates where the symbol should be placed - on the right or left of the number */
  direction?: Maybe<NumberValueUnitDirection>;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** Number */
  number?: Maybe<Scalars['Float']['output']>;
  /** The symbol of the unit */
  symbol?: Maybe<Scalars['String']['output']>;
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** The central type in the Monday.com Objects Platform, representing any entity in the system. This unified type can represent instances of boards, docs, dashboards, workflows, and specialized objects. The specific type of an object is determined by its app_feature_reference_id. */
export type Object = {
  __typename?: 'Object';
  /** The ID of the user who created this object. Useful for tracking object origin. */
  creator?: Maybe<Scalars['String']['output']>;
  /** Optional description of the object, providing additional context about its purpose or contents. */
  description?: Maybe<Scalars['String']['output']>;
  /** The ID of the folder containing this object, if the object is organized in a folder structure. */
  folder_id?: Maybe<Scalars['String']['output']>;
  /** The unique identifier of the object. Can be used to reference this specific object in queries and mutations. */
  id?: Maybe<Scalars['String']['output']>;
  /** The display name of the object. This is what appears in the Monday.com interface. */
  name?: Maybe<Scalars['String']['output']>;
  /** List of users who are owners of this object. Owners have full control permissions. */
  owners?: Maybe<Array<User>>;
  /** The kind/visibility setting of the object (private, public, share). Determines who can access it. */
  privacy_kind?: Maybe<Scalars['String']['output']>;
  /** The current state of the object. Determines visibility in the interface. */
  state?: Maybe<Scalars['String']['output']>;
  /** List of users who are subscribers to this object. Subscribers receive notifications about changes. */
  subscribers?: Maybe<Array<User>>;
  /** Timestamp of when the object was last updated. Format is ISO 8601. */
  updated_at?: Maybe<Scalars['String']['output']>;
  /** The ID of the workspace containing this object. Null indicates the object is in the main workspace. */
  workspace_id?: Maybe<Scalars['String']['output']>;
};

export type ObjectDynamicPositionInput = {
  /** The next object in the list */
  nextObject?: InputMaybe<HierarchyObjectIdInputType>;
  /** The previous object in the list */
  prevObject?: InputMaybe<HierarchyObjectIdInputType>;
};

/** Response for object operations indicating success or failure */
export type ObjectOperationResponse = {
  __typename?: 'ObjectOperationResponse';
  /** Indicates whether the operation was successful */
  success?: Maybe<Scalars['Boolean']['output']>;
};

/** The state of the object. */
export enum ObjectState {
  /** The object is active. */
  Active = 'ACTIVE',
  /** The object is archived. */
  Archived = 'ARCHIVED',
  /** The object is deleted. */
  Deleted = 'DELETED'
}

/** Represents a monday object. */
export enum ObjectType {
  /** Represents a board object type. */
  Board = 'Board',
  /** Represents a folder object type. */
  Folder = 'Folder',
  /** Represents an overview object type. */
  Overview = 'Overview'
}

/** Represents object type unique key and metadata. */
export type ObjectTypeUniqueKey = {
  __typename?: 'ObjectTypeUniqueKey';
  /** The name of the app feature object type (e.g., 'Workflow', 'Capacity manager'). */
  app_feature_name?: Maybe<Scalars['String']['output']>;
  /** The name of the app that provides this object type. */
  app_name?: Maybe<Scalars['String']['output']>;
  /** A short description of what this object type represents. */
  description?: Maybe<Scalars['String']['output']>;
  /** The unique identifier for the object type, formatted as 'app_slug::app_feature_slug' */
  object_type_unique_key?: Maybe<Scalars['String']['output']>;
};

/** A delta operation with insert content and optional formatting attributes */
export type Operation = {
  __typename?: 'Operation';
  /** Optional formatting attributes (bold, italic, underline, strike, code, link, color, background) */
  attributes?: Maybe<Attributes>;
  /** Content to insert - either text or blot object */
  insert?: Maybe<InsertOps>;
};

/** A delta operation with insert content and optional formatting attributes */
export type OperationInput = {
  /** Optional formatting attributes (bold, italic, underline, strike, code, link, color, background) */
  attributes?: InputMaybe<AttributesInput>;
  /** Content to insert - either text or blot object */
  insert: InsertOpsInput;
};

/** Defines the sorting order for returned objects in the objects query. */
export enum OrderBy {
  /** Sort objects by their creation date, from newest to oldest. */
  CreatedAt = 'CREATED_AT',
  /** Sort objects by when they were last used, from most recent to least recent. */
  UsedAt = 'USED_AT'
}

/** The working status of a user. */
export type OutOfOffice = {
  __typename?: 'OutOfOffice';
  /** Is the status active? */
  active?: Maybe<Scalars['Boolean']['output']>;
  /** Are notification disabled? */
  disable_notifications?: Maybe<Scalars['Boolean']['output']>;
  /** The status end date. */
  end_date?: Maybe<Scalars['Date']['output']>;
  /** The status start date. */
  start_date?: Maybe<Scalars['Date']['output']>;
  /** Out of office type. */
  type?: Maybe<Scalars['String']['output']>;
};

/** A monday.com overview. */
export type Overview = {
  __typename?: 'Overview';
  /** The time the overview was created at. */
  created_at?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** The creator of the overview. */
  creator: User;
  /** The overview's folder unique identifier. */
  folder_id?: Maybe<Scalars['ID']['output']>;
  /** The unique identifier of the overview. */
  id: Scalars['ID']['output'];
  /** The overview's kind (public/private). */
  kind?: Maybe<Scalars['String']['output']>;
  /** The overview's name. */
  name: Scalars['String']['output'];
  /** The overview's state. */
  state: Scalars['String']['output'];
  /** The last time the overview was updated at. */
  updated_at?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** The overview's workspace unique identifier. */
  workspace_id?: Maybe<Scalars['ID']['output']>;
};

/** Input for creating page break blocks */
export type PageBreakBlockInput = {
  /** The parent block id to append the created block under. */
  parent_block_id?: InputMaybe<Scalars['String']['input']>;
};

/** Content for a page break block */
export type PageBreakContent = DocBaseBlockContent & {
  __typename?: 'PageBreakContent';
  /** The alignment of the block content */
  alignment?: Maybe<BlockAlignment>;
  /** The text direction of the block content */
  direction?: Maybe<BlockDirection>;
};

/**
 * Pagination metadata: indicates the current page and page size, whether there
 *   are more pages, and the next page number if one exists. Note that the page size reflects
 *   the number of items requested, not the number of items returned.
 */
export type Pagination = {
  __typename?: 'Pagination';
  /** Indicates if there are more pages available */
  has_more_pages?: Maybe<Scalars['Boolean']['output']>;
  /** Number of the next page */
  next_page_number?: Maybe<Scalars['Int']['output']>;
  /** Current page number (1-based) */
  page?: Maybe<Scalars['Int']['output']>;
  /** Number of items per page */
  page_size?: Maybe<Scalars['Int']['output']>;
};

/** Pagination parameters for queries */
export type PaginationInput = {
  /** Last ID for cursor-based pagination */
  lastId?: InputMaybe<Scalars['Int']['input']>;
  /** Maximum number of results to return */
  limit?: InputMaybe<Scalars['Int']['input']>;
};

/** Input type for dependency metadata payload containing dependency type and lag configuration */
export type PayloadInput = {
  /** Type of dependency relationship between the items */
  dependency_type?: InputMaybe<DependencyRelation>;
  /** Number of days offset between the dependent items (can be negative) */
  lag?: InputMaybe<Scalars['Int']['input']>;
};

export type PeopleEntity = {
  __typename?: 'PeopleEntity';
  /** Id of the entity: a person or a team */
  id: Scalars['ID']['output'];
  /** Type of entity */
  kind?: Maybe<Kind>;
};

export type PeopleValue = ColumnValue & {
  __typename?: 'PeopleValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** The people and teams assigned to the item. */
  persons_and_teams?: Maybe<Array<PeopleEntity>>;
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

export type PersonValue = ColumnValue & {
  __typename?: 'PersonValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** The person assigned to the item. */
  person_id?: Maybe<Scalars['ID']['output']>;
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** Phone questions only: Configuration for setting a specific predefined phone country prefix that will be pre-selected for users. */
export type PhonePrefixPredefined = {
  __typename?: 'PhonePrefixPredefined';
  /** Whether a predefined phone prefix is enabled for phone number questions. When true, the specified prefix will be pre-selected. */
  enabled: Scalars['Boolean']['output'];
  /** The predefined phone country prefix to use as country code in capital letters (e.g., "US", "UK", "IL"). Only used when enabled is true. */
  prefix?: Maybe<Scalars['String']['output']>;
};

/** Phone questions only: Configuration for setting a specific predefined phone country prefix that will be pre-selected for users. */
export type PhonePrefixPredefinedInput = {
  /** Whether a predefined phone prefix is enabled for phone number questions. When true, the specified prefix will be pre-selected. */
  enabled: Scalars['Boolean']['input'];
  /** The predefined phone country prefix to use as country code in capital letters (e.g., "US", "UK", "IL"). Only used when enabled is true. */
  prefix?: InputMaybe<Scalars['String']['input']>;
};

export type PhoneValue = ColumnValue & {
  __typename?: 'PhoneValue';
  /** The column that this value belongs to. */
  column: Column;
  /** ISO-2 country code */
  country_short_name?: Maybe<Scalars['String']['output']>;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** Phone number */
  phone?: Maybe<Scalars['String']['output']>;
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** A payment plan. */
export type Plan = {
  __typename?: 'Plan';
  /** The maximum users allowed in the plan. */
  max_users: Scalars['Int']['output'];
  /** The plan's time period. */
  period?: Maybe<Scalars['String']['output']>;
  /** The plan's tier. */
  tier?: Maybe<Scalars['String']['output']>;
  /** The plan's version. */
  version: Scalars['Int']['output'];
};

/** The Platform API's data. */
export type PlatformApi = {
  __typename?: 'PlatformApi';
  /** API analytics. */
  daily_analytics?: Maybe<DailyAnalytics>;
  /** Platform API daily limit. */
  daily_limit?: Maybe<DailyLimit>;
};

/** API usage per app. */
export type PlatformApiDailyAnalyticsByApp = {
  __typename?: 'PlatformApiDailyAnalyticsByApp';
  /** API app id */
  api_app_id: Scalars['ID']['output'];
  /** Application. */
  app?: Maybe<AppType>;
  /** API usage for the app. */
  usage: Scalars['Int']['output'];
};

/** API usage per day. */
export type PlatformApiDailyAnalyticsByDay = {
  __typename?: 'PlatformApiDailyAnalyticsByDay';
  /** Day. */
  day: Scalars['String']['output'];
  /** API usage for the day. */
  usage: Scalars['Int']['output'];
};

/** API usage per user. */
export type PlatformApiDailyAnalyticsByUser = {
  __typename?: 'PlatformApiDailyAnalyticsByUser';
  /** API usage for the user. */
  usage: Scalars['Int']['output'];
  /** User. */
  user?: Maybe<User>;
};

/** The position relative method. */
export enum PositionRelative {
  /** position after at the given entity. */
  AfterAt = 'after_at',
  /** position before at the given entity. */
  BeforeAt = 'before_at'
}

/** Configuration for automatically populating question values from various data sources such as user account information or URL query parameters. */
export type PrefillSettings = {
  __typename?: 'PrefillSettings';
  /** Whether prefill functionality is enabled for this question. When true, the question will attempt to auto-populate values from the specified source. */
  enabled: Scalars['Boolean']['output'];
  /** The specific field or parameter name to lookup from the prefill source. For account sources, this would be a user property like "name" or "email". For query parameters, this would be the parameter name that would be set in the URL. */
  lookup: Scalars['String']['output'];
  /** The data source to use for prefilling the question value. Check the PrefillSources for available options. */
  source?: Maybe<FormQuestionPrefillSources>;
};

/** Configuration for automatically populating question values from various data sources such as user account information or URL query parameters. */
export type PrefillSettingsInput = {
  /** Whether prefill functionality is enabled for this question. When true, the question will attempt to auto-populate values from the specified source. */
  enabled: Scalars['Boolean']['input'];
  /** The specific field or parameter name to lookup from the prefill source. For account sources, this would be a user property like "name" or "email". For query parameters, this would be the parameter name that would be set in the URL. */
  lookup?: InputMaybe<Scalars['String']['input']>;
  /** The data source to use for prefilling the question value. Check the PrefillSources for available options. */
  source?: InputMaybe<FormQuestionPrefillSources>;
};

/** The kind/visibility setting of the article (private, public). Determines who can access it. */
export enum PrivacyKind {
  /** Private objects are only visible to specific users who are members of the object. */
  Private = 'PRIVATE',
  /** Public objects are visible to all users within the account, unless their access is blocked on a higher level in the hierarchy, or by specific object permission. */
  Public = 'PUBLIC'
}

/** The product to invite the users to. */
export enum Product {
  Crm = 'crm',
  Dev = 'dev',
  Forms = 'forms',
  Knowledge = 'knowledge',
  Service = 'service',
  Whiteboard = 'whiteboard',
  WorkManagement = 'work_management',
  Workflows = 'workflows'
}

export type ProgressValue = ColumnValue & {
  __typename?: 'ProgressValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** Text representation of the column value. Note: Not all columns support textual value */
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** Root query type for the Dependencies service */
export type Query = {
  __typename?: 'Query';
  /** Get the connected account's information. */
  account?: Maybe<Account>;
  /** Returns all connections for the account. Requires admin privileges. */
  account_connections?: Maybe<Array<Connection>>;
  /** Get all roles for the account */
  account_roles?: Maybe<Array<AccountRole>>;
  /** Performs aggregation operations on board data */
  aggregate?: Maybe<AggregateQueryResult>;
  /** Returns all available widget schemas for documentation and validation purposes */
  all_widgets_schema?: Maybe<Array<WidgetSchemaInfo>>;
  /** Get an app by ID. */
  app?: Maybe<AppType>;
  /** Get a collection of installs of an app. */
  app_installs?: Maybe<Array<Maybe<AppInstall>>>;
  /** Get the current app subscription. Note: This query does not work in the playground */
  app_subscription?: Maybe<Array<Maybe<AppSubscription>>>;
  /** Get operations counter current value */
  app_subscription_operations?: Maybe<AppSubscriptionOperationsCounter>;
  app_subscriptions: AppSubscriptions;
  /** Get apps monetization information for an account */
  apps_monetization_info?: Maybe<AppsMonetizationInfo>;
  /** Get apps monetization status for an account */
  apps_monetization_status?: Maybe<AppMonetizationStatus>;
  /** Get a collection of assets by ids. */
  assets?: Maybe<Array<Maybe<Asset>>>;
  /**
   * Lists all the audit event types that can be logged and information about them.
   *
   *     Example query:
   *
   *     query {
   *       audit_event_catalogue {
   *         name
   *         description
   *         metadata_details
   *       }
   *     }
   */
  audit_event_catalogue?: Maybe<Array<AuditEventCatalogueEntry>>;
  /**
   * Retrieve audit logs for your Monday account. You can
   *     filter logs by event types, user ID, IP address and start and end date.
   *
   *     Here is an example audit log query:
   *
   *     query {
   *       audit_logs(
   *         user_id: "1234567890"
   *         events: ["login", "logout"]
   *         ip_address: "123.123.123.123"
   *         start_time: "2021-01-01T00:00:00Z"
   *         end_time: "2021-01-01T23:59:59Z"
   *         limit: 100
   *         page: 1
   *       ) {
   *         logs {
   *           timestamp
   *           event
   *           ip_address
   *           user {
   *             id
   *             name
   *             email
   *           }
   *           activity_metadata
   *         }
   *         pagination {
   *           page
   *           page_size
   *           has_more_pages
   *           next_page_number
   *         }
   *       }
   *     }
   *
   *     To get the list of all possible event types, you should use the audit_event_catalogue query like this:
   *
   *     query {
   *       audit_event_catalogue {
   *         name
   *         description
   *         metadata_details
   *       }
   *     }
   */
  audit_logs?: Maybe<AuditLogPage>;
  /** List block events for a given trigger UUID */
  block_events?: Maybe<BlockEventsPage>;
  /** Get board candidates based on workspace and usage type */
  board_candidates?: Maybe<Array<Board>>;
  /** Get a collection of boards. */
  boards?: Maybe<Array<Maybe<Board>>>;
  /** Get the status of a bulk import items process */
  bulk_import_items_status: BulkImportStatus;
  /** Get the complexity data of your queries. */
  complexity?: Maybe<Complexity>;
  /** Fetch a single connection by its unique ID. */
  connection?: Maybe<Connection>;
  /** Get board IDs that are linked to a specific connection. */
  connection_board_ids?: Maybe<Array<Scalars['Int']['output']>>;
  /** Returns connections for the authenticated user. Supports filtering, pagination, ordering, and partial-scope options. */
  connections?: Maybe<Array<Connection>>;
  custom_activity?: Maybe<Array<CustomActivity>>;
  /** Get a collection of docs. */
  docs?: Maybe<Array<Maybe<Document>>>;
  /** Export the dependency graph for a specific board */
  export_graph?: Maybe<BoardGraphExport>;
  /** Converts document content into standard markdown format for external use, backup, or processing. Exports the entire document by default, or specific blocks if block IDs are provided. Use this to extract content for integration with other systems, create backups, generate reports, or process document content with external tools. The output is clean, portable markdown that preserves formatting and structure. */
  export_markdown_from_doc?: Maybe<ExportMarkdownResult>;
  /** Get all personal list items by list ID */
  favorites?: Maybe<Array<GraphqlHierarchyObjectItem>>;
  /** Get a collection of folders. Note: This query won't return folders from closed workspaces to which you are not subscribed */
  folders?: Maybe<Array<Maybe<Folder>>>;
  /** Fetch a form by its token. The returned form includes all the details of the form such as its settings, questions, title, etc. Use this endpoint when you need to retrieve complete form data for display or processing. Requires that the requesting user has read access to the associated board. */
  form?: Maybe<ResponseForm>;
  /** Retrieves the JSON schema definition for a specific column type. Use this query before calling update_column mutation to understand the structure and validation rules for the defaults parameter. The schema defines what properties are available when updating columns of a specific type. */
  get_column_type_schema?: Maybe<Scalars['JSON']['output']>;
  /**
   * Retrieves the JSON schema definition for a specific create view type.
   *       Use this query before calling create_view mutation to understand the structure and validation rules for the settings parameter.
   *       The schema defines what properties are available when creating views of a specific type.
   */
  get_view_schema_by_type?: Maybe<Scalars['JSON']['output']>;
  /** Get a collection of items. */
  items?: Maybe<Array<Maybe<Item>>>;
  /** Search items by multiple columns and values. */
  items_page_by_column_values: ItemsResponse;
  /** Get managed column data. */
  managed_column?: Maybe<Array<ManagedColumn>>;
  /** Search for marketplace apps using AI */
  marketplace_ai_search: MarketplaceAiSearchResults;
  marketplace_app_discounts: Array<MarketplaceAppDiscount>;
  /** Search for marketplace apps using full-text search */
  marketplace_fulltext_search: MarketplaceSearchResults;
  /** Search for marketplace apps using a combination of vector and full-text search */
  marketplace_hybrid_search: MarketplaceSearchResults;
  /** Search for marketplace apps using vector similarity */
  marketplace_vector_search: MarketplaceSearchResults;
  /** Get the connected user's information. */
  me?: Maybe<User>;
  /** Get mute board notification settings for the current user */
  mute_board_settings?: Maybe<Array<BoardMuteSettings>>;
  /** Get next pages of board's items (rows) by cursor. */
  next_items_page: ItemsResponse;
  notifications?: Maybe<Array<NotificationV2>>;
  /** Retrieves the current user's notification settings across all available channels. */
  notifications_settings?: Maybe<Array<NotificationSetting>>;
  /** Retrieves a list of available object types that can be created or queried. Each object type is uniquely identified by an 'object_type_unique_key'. This key is required for mutations like 'create_object' and for filtering in the 'objects' query. Use this query to discover what types of objects are available in the system (e.g., 'workflows', 'projects') and get their corresponding unique keys. The structure of unique key is 'app_slug::app_feature_slug'. */
  object_types_unique_keys?: Maybe<Array<ObjectTypeUniqueKey>>;
  /** Retrieves a list of objects from the Monday.com Objects Platform based on specified filters. This query can return any type of object (board, doc, dashboard, workflow, etc.) depending on the filter criteria. Use object_type_unique_keys to filter for specific object types. */
  objects?: Maybe<Array<Object>>;
  /** Platform API data. */
  platform_api?: Maybe<PlatformApi>;
  /** Get a collection of replies filtered by board IDs and date range. */
  replies?: Maybe<Array<Reply>>;
  /** Search for items using various search strategies. */
  search_items?: Maybe<SearchItemsGraphQlResultsView>;
  /** Get a collection of monday dev sprints */
  sprints?: Maybe<Array<Sprint>>;
  /** Get a collection of tags. */
  tags?: Maybe<Array<Maybe<Tag>>>;
  /** Get a collection of teams. */
  teams?: Maybe<Array<Maybe<Team>>>;
  /** Fetches timeline items for a given item */
  timeline?: Maybe<TimelineResponse>;
  timeline_item?: Maybe<TimelineItem>;
  /** Fetch a single trigger event by UUID */
  trigger_event?: Maybe<TriggerEvent>;
  /** List trigger events with optional filters */
  trigger_events?: Maybe<TriggerEventsPage>;
  updates?: Maybe<Array<Update>>;
  /** Returns connections that belong to the authenticated user. */
  user_connections?: Maybe<Array<Connection>>;
  /** Get a collection of users. */
  users?: Maybe<Array<Maybe<User>>>;
  /** Get the required column IDs for a board */
  validations?: Maybe<Validations>;
  /** Get the API version in use */
  version: Version;
  /** Get a list containing the versions of the API */
  versions?: Maybe<Array<Version>>;
  /** Get a collection of webhooks for the board */
  webhooks?: Maybe<Array<Maybe<Webhook>>>;
  /** Get a collection of workspaces. */
  workspaces?: Maybe<Array<Maybe<Workspace>>>;
};


/** Root query type for the Dependencies service */
export type QueryAccount_ConnectionsArgs = {
  order?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pagination?: InputMaybe<PaginationInput>;
  withAutomations?: InputMaybe<Scalars['Boolean']['input']>;
  withStateValidation?: InputMaybe<Scalars['Boolean']['input']>;
};


/** Root query type for the Dependencies service */
export type QueryAggregateArgs = {
  query: AggregateQueryInput;
};


/** Root query type for the Dependencies service */
export type QueryAppArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for the Dependencies service */
export type QueryApp_InstallsArgs = {
  account_id?: InputMaybe<Scalars['ID']['input']>;
  app_id: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};


/** Root query type for the Dependencies service */
export type QueryApp_Subscription_OperationsArgs = {
  kind?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type for the Dependencies service */
export type QueryApp_SubscriptionsArgs = {
  account_id?: InputMaybe<Scalars['Int']['input']>;
  app_id: Scalars['ID']['input'];
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<SubscriptionStatus>;
};


/** Root query type for the Dependencies service */
export type QueryAssetsArgs = {
  ids: Array<Scalars['ID']['input']>;
};


/** Root query type for the Dependencies service */
export type QueryAudit_LogsArgs = {
  end_time?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
  events?: InputMaybe<Array<Scalars['String']['input']>>;
  ip_address?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  start_time?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
  user_id?: InputMaybe<Scalars['ID']['input']>;
};


/** Root query type for the Dependencies service */
export type QueryBlock_EventsArgs = {
  nextPageOffset?: InputMaybe<Scalars['Int']['input']>;
  triggerUuid: Scalars['String']['input'];
};


/** Root query type for the Dependencies service */
export type QueryBoard_CandidatesArgs = {
  usageType: BoardUsage;
  workspaceId: Scalars['String']['input'];
};


/** Root query type for the Dependencies service */
export type QueryBoardsArgs = {
  board_kind?: InputMaybe<BoardKind>;
  hierarchy_types?: InputMaybe<Array<BoardHierarchy>>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  latest?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<BoardsOrderBy>;
  page?: InputMaybe<Scalars['Int']['input']>;
  state?: InputMaybe<State>;
  workspace_ids?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>>>;
};


/** Root query type for the Dependencies service */
export type QueryBulk_Import_Items_StatusArgs = {
  import_id: Scalars['ID']['input'];
};


/** Root query type for the Dependencies service */
export type QueryConnectionArgs = {
  id: Scalars['Int']['input'];
};


/** Root query type for the Dependencies service */
export type QueryConnection_Board_IdsArgs = {
  connectionId: Scalars['Int']['input'];
};


/** Root query type for the Dependencies service */
export type QueryConnectionsArgs = {
  connectionState?: InputMaybe<Scalars['String']['input']>;
  order?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pagination?: InputMaybe<PaginationInput>;
  withAutomations?: InputMaybe<Scalars['Boolean']['input']>;
  withPartialScopes?: InputMaybe<Scalars['Boolean']['input']>;
  withStateValidation?: InputMaybe<Scalars['Boolean']['input']>;
};


/** Root query type for the Dependencies service */
export type QueryCustom_ActivityArgs = {
  color?: InputMaybe<CustomActivityColor>;
  icon_id?: InputMaybe<CustomActivityIcon>;
  ids?: InputMaybe<Array<Scalars['String']['input']>>;
  name?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type for the Dependencies service */
export type QueryDocsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  object_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  order_by?: InputMaybe<DocsOrderBy>;
  page?: InputMaybe<Scalars['Int']['input']>;
  workspace_ids?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>>>;
};


/** Root query type for the Dependencies service */
export type QueryExport_GraphArgs = {
  boardId: Scalars['String']['input'];
};


/** Root query type for the Dependencies service */
export type QueryExport_Markdown_From_DocArgs = {
  blockIds?: InputMaybe<Array<Scalars['String']['input']>>;
  docId: Scalars['ID']['input'];
};


/** Root query type for the Dependencies service */
export type QueryFoldersArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  workspace_ids?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>>>;
};


/** Root query type for the Dependencies service */
export type QueryFormArgs = {
  formToken: Scalars['String']['input'];
};


/** Root query type for the Dependencies service */
export type QueryGet_Column_Type_SchemaArgs = {
  type: ColumnType;
};


/** Root query type for the Dependencies service */
export type QueryGet_View_Schema_By_TypeArgs = {
  mutationType: ViewMutationKind;
  type: ViewKind;
};


/** Root query type for the Dependencies service */
export type QueryItemsArgs = {
  exclude_nonactive?: InputMaybe<Scalars['Boolean']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  newest_first?: InputMaybe<Scalars['Boolean']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};


/** Root query type for the Dependencies service */
export type QueryItems_Page_By_Column_ValuesArgs = {
  board_id: Scalars['ID']['input'];
  columns?: InputMaybe<Array<ItemsPageByColumnValuesQuery>>;
  cursor?: InputMaybe<Scalars['String']['input']>;
  hierarchy_scope_config?: InputMaybe<Scalars['String']['input']>;
  limit?: Scalars['Int']['input'];
};


/** Root query type for the Dependencies service */
export type QueryManaged_ColumnArgs = {
  id?: InputMaybe<Array<Scalars['String']['input']>>;
  state?: InputMaybe<Array<ManagedColumnState>>;
};


/** Root query type for the Dependencies service */
export type QueryMarketplace_Ai_SearchArgs = {
  input: MarketplaceAiSearchInput;
};


/** Root query type for the Dependencies service */
export type QueryMarketplace_App_DiscountsArgs = {
  app_id: Scalars['ID']['input'];
};


/** Root query type for the Dependencies service */
export type QueryMarketplace_Fulltext_SearchArgs = {
  input: MarketplaceSearchInput;
};


/** Root query type for the Dependencies service */
export type QueryMarketplace_Hybrid_SearchArgs = {
  input: MarketplaceSearchInput;
};


/** Root query type for the Dependencies service */
export type QueryMarketplace_Vector_SearchArgs = {
  input: MarketplaceSearchInput;
};


/** Root query type for the Dependencies service */
export type QueryMute_Board_SettingsArgs = {
  board_ids: Array<Scalars['ID']['input']>;
};


/** Root query type for the Dependencies service */
export type QueryNext_Items_PageArgs = {
  cursor: Scalars['String']['input'];
  limit?: Scalars['Int']['input'];
};


/** Root query type for the Dependencies service */
export type QueryNotificationsArgs = {
  cursor?: InputMaybe<Scalars['ID']['input']>;
  filter_read?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  since?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
};


/** Root query type for the Dependencies service */
export type QueryNotifications_SettingsArgs = {
  channels?: InputMaybe<Array<ChannelType>>;
  scope_id?: InputMaybe<Scalars['Int']['input']>;
  scope_type: ScopeType;
  setting_kinds?: InputMaybe<Array<Scalars['String']['input']>>;
};


/** Root query type for the Dependencies service */
export type QueryObjectsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  object_type_unique_keys?: InputMaybe<Array<Scalars['String']['input']>>;
  order_by?: InputMaybe<OrderBy>;
  privacy_kind?: InputMaybe<PrivacyKind>;
  state?: InputMaybe<ObjectState>;
  workspace_ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};


/** Root query type for the Dependencies service */
export type QueryRepliesArgs = {
  board_ids: Array<Scalars['ID']['input']>;
  created_at_from?: InputMaybe<Scalars['String']['input']>;
  created_at_to?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};


/** Root query type for the Dependencies service */
export type QuerySearch_ItemsArgs = {
  assignee?: InputMaybe<AssigneeInput>;
  boardId?: InputMaybe<Scalars['ID']['input']>;
  boosts?: InputMaybe<BoostConfigurationInput>;
  dateRange?: InputMaybe<SearchDateRangeInput>;
  exactMatch?: InputMaybe<Scalars['Boolean']['input']>;
  query?: InputMaybe<Scalars['String']['input']>;
  rerankingStrategy?: InputMaybe<RerankingStrategy>;
  searchType: Search;
  size: Scalars['Int']['input'];
  status?: InputMaybe<Scalars['String']['input']>;
  workspaceIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};


/** Root query type for the Dependencies service */
export type QuerySprintsArgs = {
  ids: Array<Scalars['ID']['input']>;
};


/** Root query type for the Dependencies service */
export type QueryTagsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};


/** Root query type for the Dependencies service */
export type QueryTeamsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};


/** Root query type for the Dependencies service */
export type QueryTimelineArgs = {
  id: Scalars['ID']['input'];
  skipConnectedItems?: InputMaybe<Scalars['Boolean']['input']>;
};


/** Root query type for the Dependencies service */
export type QueryTimeline_ItemArgs = {
  id: Scalars['ID']['input'];
};


/** Root query type for the Dependencies service */
export type QueryTrigger_EventArgs = {
  triggerUuid: Scalars['String']['input'];
};


/** Root query type for the Dependencies service */
export type QueryTrigger_EventsArgs = {
  filters?: InputMaybe<TriggerEventsFiltersInput>;
  nextPageOffset?: InputMaybe<Scalars['Int']['input']>;
};


/** Root query type for the Dependencies service */
export type QueryUpdatesArgs = {
  from_date?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  to_date?: InputMaybe<Scalars['String']['input']>;
};


/** Root query type for the Dependencies service */
export type QueryUser_ConnectionsArgs = {
  order?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  pageSize?: InputMaybe<Scalars['Int']['input']>;
  pagination?: InputMaybe<PaginationInput>;
  withAutomations?: InputMaybe<Scalars['Boolean']['input']>;
  withStateValidation?: InputMaybe<Scalars['Boolean']['input']>;
};


/** Root query type for the Dependencies service */
export type QueryUsersArgs = {
  emails?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  kind?: InputMaybe<UserKind>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  newest_first?: InputMaybe<Scalars['Boolean']['input']>;
  non_active?: InputMaybe<Scalars['Boolean']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};


/** Root query type for the Dependencies service */
export type QueryValidationsArgs = {
  id: Scalars['ID']['input'];
  type?: InputMaybe<ValidationsEntityType>;
};


/** Root query type for the Dependencies service */
export type QueryWebhooksArgs = {
  app_webhooks_only?: InputMaybe<Scalars['Boolean']['input']>;
  board_id: Scalars['ID']['input'];
};


/** Root query type for the Dependencies service */
export type QueryWorkspacesArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  kind?: InputMaybe<WorkspaceKind>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<WorkspacesOrderBy>;
  page?: InputMaybe<Scalars['Int']['input']>;
  state?: InputMaybe<State>;
};

/** Contains the results of the query. */
export type QueryResult = {
  __typename?: 'QueryResult';
  /** The item data from the search result. */
  data: Item;
  /** The relevance score of the search result. */
  score: Scalars['Float']['output'];
};

export type QuestionOptionInput = {
  /** The label to display for the option */
  label: Scalars['String']['input'];
};

export type QuestionOrderInput = {
  /** The unique identifier for the question. Used to target specific questions within a form. */
  id: Scalars['String']['input'];
};

export type RatingValue = ColumnValue & {
  __typename?: 'RatingValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** Rating value */
  rating?: Maybe<Scalars['Int']['output']>;
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** Error that occurred while removing team owners. */
export type RemoveTeamOwnersError = {
  __typename?: 'RemoveTeamOwnersError';
  /** The error code. */
  code?: Maybe<RemoveTeamOwnersErrorCode>;
  /** The error message. */
  message?: Maybe<Scalars['String']['output']>;
  /** The id of the user that caused the error. */
  user_id?: Maybe<Scalars['ID']['output']>;
};

/** Error codes that can occur while removing team owners. */
export enum RemoveTeamOwnersErrorCode {
  CannotUpdateSelf = 'CANNOT_UPDATE_SELF',
  ExceedsBatchLimit = 'EXCEEDS_BATCH_LIMIT',
  Failed = 'FAILED',
  InvalidInput = 'INVALID_INPUT',
  UserNotFound = 'USER_NOT_FOUND',
  UserNotMemberOfTeam = 'USER_NOT_MEMBER_OF_TEAM',
  ViewersOrGuests = 'VIEWERS_OR_GUESTS'
}

/** Result of removing the team's ownership. */
export type RemoveTeamOwnersResult = {
  __typename?: 'RemoveTeamOwnersResult';
  /** Errors that occurred while removing team owners. */
  errors?: Maybe<Array<RemoveTeamOwnersError>>;
  /** The team for which the owners were removed. */
  team?: Maybe<Team>;
};

/** A reply for an update. */
export type Reply = {
  __typename?: 'Reply';
  /** The reply's assets/files. */
  assets?: Maybe<Array<Maybe<Asset>>>;
  /** The reply's html formatted body. */
  body: Scalars['String']['output'];
  /** The reply's creation date. */
  created_at?: Maybe<Scalars['Date']['output']>;
  /** The reply's creator. */
  creator?: Maybe<User>;
  /** The unique identifier of the reply creator. */
  creator_id?: Maybe<Scalars['String']['output']>;
  edited_at: Scalars['Date']['output'];
  /** The reply's unique identifier. */
  id: Scalars['ID']['output'];
  kind: Scalars['String']['output'];
  likes: Array<Like>;
  pinned_to_top: Array<UpdatePin>;
  /** The reply's text body. */
  text_body?: Maybe<Scalars['String']['output']>;
  /** The reply's last edit date. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  viewers: Array<Watcher>;
};


/** A reply for an update. */
export type ReplyViewersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};

/** List of required column IDs for a board */
export type RequiredColumns = {
  __typename?: 'RequiredColumns';
  /** Array of required column IDs */
  required_column_ids: Array<Scalars['String']['output']>;
};

/** Algorithms for reranking results. */
export enum RerankingStrategy {
  /** Use cross-encoder model for reranking results. */
  CrossEncoder = 'CROSS_ENCODER'
}

export type ResponseForm = {
  __typename?: 'ResponseForm';
  /** Object containing accessibility settings such as language, alt text, and reading direction. */
  accessibility?: Maybe<FormAccessibility>;
  /** Boolean indicating if the form is currently accepting responses and visible to users. */
  active: Scalars['Boolean']['output'];
  /** Object containing visual styling settings including colors, fonts, layout, and branding. */
  appearance?: Maybe<FormAppearance>;
  /** Boolean indicating if this form was built using monday’s AI form builder agent. */
  builtWithAI: Scalars['Boolean']['output'];
  /** Optional detailed description explaining the form purpose, displayed below the title. */
  description?: Maybe<Scalars['String']['output']>;
  /** Object containing feature toggles and settings like password protection, response limits, etc. */
  features?: Maybe<FormFeatures>;
  /** The unique identifier for the form. Auto-generated upon creation. */
  id: Scalars['Int']['output'];
  /** Boolean indicating if responses are collected without identifying the submitter. */
  isAnonymous: Scalars['Boolean']['output'];
  /** The ID of the user who created and owns this form. Determines permissions. */
  ownerId?: Maybe<Scalars['Int']['output']>;
  /** Array of question objects that make up the form content, in display order. */
  questions?: Maybe<Array<FormQuestion>>;
  /** Array of tracking tags for categorization and analytics (e.g., UTM parameters for marketing tracking). */
  tags?: Maybe<Array<FormTag>>;
  /** The display title shown to users at the top of the form. */
  title: Scalars['String']['output'];
  /** The unique identifier token for the form. Required for all form-specific operations. */
  token: Scalars['String']['output'];
  /** The category or classification of the form for organizational purposes. */
  type?: Maybe<Scalars['String']['output']>;
};

/** notification settings scope types, the options are account user defaults or user private settings */
export enum ScopeType {
  AccountNewUserDefaults = 'AccountNewUserDefaults',
  User = 'User'
}

/** Available search modes. */
export enum Search {
  /** Combined lexical and semantic search with reranking. */
  Hybrid = 'HYBRID',
  /** Keyword-based search using text matching. */
  Lexical = 'LEXICAL',
  /** Vector-based search using semantic similarity. */
  Semantic = 'SEMANTIC'
}

/** Date range filter for search queries */
export type SearchDateRangeInput = {
  /** Filter items created after this date */
  createdAfter?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
  /** Filter items created before this date */
  createdBefore?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
  /** Filter items updated after this date */
  updatedAfter?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
  /** Filter items updated before this date */
  updatedBefore?: InputMaybe<Scalars['ISO8601DateTime']['input']>;
};

/** Response of the search request. */
export type SearchItemsGraphQlResultsView = {
  __typename?: 'SearchItemsGraphQlResultsView';
  /** Indicates if the results have been reranked */
  reranked?: Maybe<Scalars['Boolean']['output']>;
  /** The results of the items search. */
  results: Array<QueryResult>;
};

/** Response type for detailed board permissions. Contains information about the permissions that were set. */
export type SetBoardPermissionResponse = {
  __typename?: 'SetBoardPermissionResponse';
  /** The technical board write permissions value that was set (e.g., 'everyone', 'collaborators', 'owners'). */
  edit_permissions: BoardEditPermissions;
  /** List of any actions that failed during the permission update process. */
  failed_actions?: Maybe<Array<Scalars['String']['output']>>;
};

/** Input type for setting a form password */
export type SetFormPasswordInput = {
  /** The password to set for the form. Must be at least 1 character long. */
  password: Scalars['String']['input'];
};

/** Direction for sorting items */
export enum SortDirection {
  /** Ascending order */
  Asc = 'ASC',
  /** Descending order */
  Desc = 'DESC'
}

/** A monday dev sprint. */
export type Sprint = {
  __typename?: 'Sprint';
  /** date at which the monday dev sprint complete action was performed, null if the sprint was never completed */
  end_date?: Maybe<Scalars['Date']['output']>;
  /** monday dev sprint unique identifier */
  id: Scalars['ID']['output'];
  /** items associated with the monday dev sprint */
  items?: Maybe<Array<Item>>;
  /** monday dev sprint name */
  name?: Maybe<Scalars['String']['output']>;
  /** snapshots of the monday dev sprint */
  snapshots?: Maybe<Array<SprintSnapshot>>;
  /** date at which the monday dev sprint start action was performed, null if the sprint was never started */
  start_date?: Maybe<Scalars['Date']['output']>;
  /** current state of the monday dev sprint */
  state?: Maybe<SprintState>;
  /** user-editable planned timeline for the monday dev sprint, which may differ from its start and complete dates */
  timeline?: Maybe<SprintTimeline>;
};


/** A monday dev sprint. */
export type SprintSnapshotsArgs = {
  type?: InputMaybe<Array<SprintSnapshotKind>>;
};

/** A monday dev sprint snapshot. */
export type SprintSnapshot = {
  __typename?: 'SprintSnapshot';
  /** monday dev sprint snapshot columns metadata */
  columns_metadata?: Maybe<Array<SprintSnapshotColumnMetadata>>;
  /** date and time when the object was created */
  created_at?: Maybe<Scalars['Date']['output']>;
  /** monday dev sprint snapshot unique identifier */
  id?: Maybe<Scalars['ID']['output']>;
  /** monday dev sprint snapshot items */
  items?: Maybe<Array<SprintSnapshotItem>>;
  /** monday dev sprint unique identifier */
  sprint_id?: Maybe<Scalars['ID']['output']>;
  /** monday dev sprint snapshot kind */
  type?: Maybe<SprintSnapshotKind>;
  /** date and time when the object was last updated */
  updated_at?: Maybe<Scalars['Date']['output']>;
};

/** A monday dev sprint snapshot column metadata. */
export type SprintSnapshotColumnMetadata = {
  __typename?: 'SprintSnapshotColumnMetadata';
  /** monday dev sprint snapshot status column done status indexes */
  done_status_indexes: Array<Scalars['Int']['output']>;
  /** monday dev sprint snapshot column id */
  id: Scalars['String']['output'];
};

/** A monday dev sprint snapshot item. */
export type SprintSnapshotItem = {
  __typename?: 'SprintSnapshotItem';
  /** monday dev sprint item column values */
  column_values?: Maybe<Array<SprintSnapshotItemColumnValue>>;
  /** monday dev sprint item unique identifier */
  id: Scalars['ID']['output'];
};

/** A monday dev sprint snapshot item column value. */
export type SprintSnapshotItemColumnValue = {
  __typename?: 'SprintSnapshotItemColumnValue';
  /** monday dev sprint snapshot item column id */
  id: Scalars['String']['output'];
  /** monday dev sprint snapshot item column type */
  type: Scalars['String']['output'];
  /** monday dev sprint snapshot item column value */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** The kind of sprint snapshot. */
export enum SprintSnapshotKind {
  /** Sprint complete snapshot kind. */
  Complete = 'COMPLETE',
  /** Sprint start snapshot kind. */
  Start = 'START'
}

/** current state of the monday dev sprint. */
export enum SprintState {
  /** sprint is active and in progress. */
  Active = 'ACTIVE',
  /** sprint is completed. */
  Completed = 'COMPLETED',
  /** sprint is planned and not yet started. */
  Planned = 'PLANNED'
}

/** user-editable planned timeline for the monday dev sprint, which may differ from its start and complete dates */
export type SprintTimeline = {
  __typename?: 'SprintTimeline';
  /** user-editable start date of the monday dev sprint timeline, may be different than the sprint start date */
  from?: Maybe<Scalars['Date']['output']>;
  /** user-editable complete date of the monday dev sprint timeline, may be different than the sprint complete date */
  to?: Maybe<Scalars['Date']['output']>;
};

/** The possible states for a board or item. */
export enum State {
  /** Active only (Default). */
  Active = 'active',
  /** Active, Archived and Deleted. */
  All = 'all',
  /** Archived only. */
  Archived = 'archived',
  /** Deleted only. */
  Deleted = 'deleted'
}

/** Input for configuring calculated capability settings on a status column */
export type StatusCalculatedCapabilityInput = {
  /** Function to calculate the values. For status columns, only COUNT_KEYS function is supported. */
  function: StatusCalculatedFunction;
};

/** Available functions for calculating values in status column capabilities */
export enum StatusCalculatedFunction {
  /** Count the number of labels */
  CountKeys = 'COUNT_KEYS'
}

/** Input for configuring status column capabilities during creation */
export type StatusColumnCapabilitiesInput = {
  /** Calculated capability settings. If provided, enables calculated functionality for the status column. */
  calculated?: InputMaybe<StatusCalculatedCapabilityInput>;
};

export enum StatusColumnColors {
  AmericanGray = 'american_gray',
  Aquamarine = 'aquamarine',
  Berry = 'berry',
  Blackish = 'blackish',
  BrightBlue = 'bright_blue',
  BrightGreen = 'bright_green',
  Brown = 'brown',
  Bubble = 'bubble',
  ChiliBlue = 'chili_blue',
  Coffee = 'coffee',
  DarkBlue = 'dark_blue',
  DarkIndigo = 'dark_indigo',
  DarkOrange = 'dark_orange',
  DarkPurple = 'dark_purple',
  DarkRed = 'dark_red',
  DoneGreen = 'done_green',
  EggYolk = 'egg_yolk',
  Explosive = 'explosive',
  GrassGreen = 'grass_green',
  Indigo = 'indigo',
  Lavender = 'lavender',
  Lilac = 'lilac',
  Lipstick = 'lipstick',
  Navy = 'navy',
  Orchid = 'orchid',
  Peach = 'peach',
  Pecan = 'pecan',
  Purple = 'purple',
  River = 'river',
  Royal = 'royal',
  Saladish = 'saladish',
  Sky = 'sky',
  SofiaPink = 'sofia_pink',
  Steel = 'steel',
  StuckRed = 'stuck_red',
  Sunset = 'sunset',
  Tan = 'tan',
  Teal = 'teal',
  Winter = 'winter',
  WorkingOrange = 'working_orange'
}

export type StatusColumnSettings = {
  __typename?: 'StatusColumnSettings';
  labels?: Maybe<Array<StatusLabel>>;
  type?: Maybe<ManagedColumnTypes>;
};

export type StatusLabel = {
  __typename?: 'StatusLabel';
  color?: Maybe<StatusColumnColors>;
  description?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['Int']['output']>;
  index?: Maybe<Scalars['Int']['output']>;
  is_deactivated?: Maybe<Scalars['Boolean']['output']>;
  is_done?: Maybe<Scalars['Boolean']['output']>;
  label?: Maybe<Scalars['String']['output']>;
};

/** A status label style. */
export type StatusLabelStyle = {
  __typename?: 'StatusLabelStyle';
  /** The label's border color in hex format. */
  border: Scalars['String']['output'];
  /** The label's color in hex format. */
  color: Scalars['String']['output'];
};

export type StatusManagedColumn = {
  __typename?: 'StatusManagedColumn';
  created_at?: Maybe<Scalars['Date']['output']>;
  created_by?: Maybe<Scalars['ID']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  revision?: Maybe<Scalars['Int']['output']>;
  settings?: Maybe<StatusColumnSettings>;
  settings_json?: Maybe<Scalars['JSON']['output']>;
  state?: Maybe<ManagedColumnState>;
  title?: Maybe<Scalars['String']['output']>;
  updated_at?: Maybe<Scalars['Date']['output']>;
  updated_by?: Maybe<Scalars['ID']['output']>;
};

export type StatusValue = ColumnValue & {
  __typename?: 'StatusValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** The index of the status in the board */
  index?: Maybe<Scalars['Int']['output']>;
  /** Whether the status is done */
  is_done?: Maybe<Scalars['Boolean']['output']>;
  /** The label of the status */
  label?: Maybe<Scalars['String']['output']>;
  /** The style of the status label */
  label_style?: Maybe<StatusLabelStyle>;
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The ID of an update attached to the status */
  update_id?: Maybe<Scalars['ID']['output']>;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** Defines the type of the user's role as members of the object */
export enum SubscriberKind {
  /** User will be added as an owner of the object, granting them full control permissions. */
  Owner = 'OWNER',
  /** User will be added as a subscriber to the object, receiving notifications about changes. */
  Subscriber = 'SUBSCRIBER'
}

/** The discounts granted to the subscription */
export type SubscriptionDiscount = {
  __typename?: 'SubscriptionDiscount';
  discount_model_type: SubscriptionDiscountModelType;
  discount_type: SubscriptionDiscountType;
  /** The value of the discount in percentage (e.g. the value 80 refers to 80%) */
  value: Scalars['Int']['output'];
};

/** The information whether the discount is percentage or nominal */
export enum SubscriptionDiscountModelType {
  Nominal = 'nominal',
  Percent = 'percent'
}

/** The information whether the discount has been granted one time or recurring */
export enum SubscriptionDiscountType {
  OneTime = 'one_time',
  Recurring = 'recurring'
}

/** The billing period of the subscription. Possible values: monthly, yearly */
export enum SubscriptionPeriodType {
  Monthly = 'monthly',
  Yearly = 'yearly'
}

/** The status of the subscription. Possible values: active, inactive. */
export enum SubscriptionStatus {
  Active = 'active',
  Inactive = 'inactive'
}

export type SubtasksValue = ColumnValue & {
  __typename?: 'SubtasksValue';
  /** The column that this value belongs to. */
  column: Column;
  /** A string representing all the names of the subtasks, separated by commas */
  display_value: Scalars['String']['output'];
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** The subitems */
  subitems: Array<Item>;
  /** The subitems IDs */
  subitems_ids: Array<Scalars['ID']['output']>;
  /** Text representation of the column value. Note: Not all columns support textual value */
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/**
 * Input for creating table blocks.
 * ⚠️  RECOMMENDATION: Use add_content_to_doc_from_markdown with markdown tables instead for simpler table creation.
 * Behavior:
 * - When a table is created, the system automatically generates `row_count × column_count` child "cell" blocks (one per cell).
 * - The table block is a container. Each generated cell block has `parentBlockId === <table-block-id>` and is used to insert content.
 *
 * Important:
 * - Always use the 2D matrix returned under `content[0].cells` to access cells.
 * - This matrix is row-major: `matrix[rowIndex][columnIndex]`.
 * - Do not rely on the order returned by `docs { blocks { ... } }`, as it's implementation-specific.
 *
 * Recommended workflow:
 * 1. Create the table and capture its ID.
 * 2. Read `content[0].cells` to get the cell ID matrix.
 * 3. Use bulk create blocks to create all the child blocks (e.g. textBlock, imageBlock) with `parentBlockId = matrix[row][col]`.
 *    Use `afterBlockId` only to order siblings within the same cell.
 */
export type TableBlockInput = {
  /** The number of columns in the table */
  column_count: Scalars['Int']['input'];
  /** The column style configuration */
  column_style?: InputMaybe<Array<ColumnStyleInput>>;
  /** The parent block id to append the created block under. */
  parent_block_id?: InputMaybe<Scalars['String']['input']>;
  /** The number of rows in the table */
  row_count: Scalars['Int']['input'];
  /** The width of the table */
  width?: InputMaybe<Scalars['Int']['input']>;
};

/** Content for a table block */
export type TableContent = DocBaseBlockContent & {
  __typename?: 'TableContent';
  /** The alignment of the block content */
  alignment?: Maybe<BlockAlignment>;
  /** 2-D array of cells (rows × columns). Each cell contains a blockId reference that represents the parent block for all content blocks within that cell. */
  cells?: Maybe<Array<TableRow>>;
  /** The column style configuration */
  column_style?: Maybe<Array<ColumnStyle>>;
  /** The text direction of the block content */
  direction?: Maybe<BlockDirection>;
  /** The width of the table */
  width?: Maybe<Scalars['Int']['output']>;
};

/** A row of cells in a table */
export type TableRow = {
  __typename?: 'TableRow';
  /** The cells in this row */
  row_cells: Array<Cell>;
};

/** Settings configuration for table view display options */
export type TableViewSettingsInput = {
  /** Column visibility configuration for the board view */
  columns?: InputMaybe<ColumnsConfigInput>;
  /** The group by to apply to the board view */
  group_by?: InputMaybe<GroupBySettingsInput>;
};

/** A tag */
export type Tag = {
  __typename?: 'Tag';
  /** The tag's color. */
  color: Scalars['String']['output'];
  /** The tag's unique identifier. */
  id: Scalars['ID']['output'];
  /** The tag's name. */
  name: Scalars['String']['output'];
};

export type TagsValue = ColumnValue & {
  __typename?: 'TagsValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** Tag ID's */
  tag_ids: Array<Scalars['Int']['output']>;
  /** A list of tags */
  tags: Array<Tag>;
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** A team of users. */
export type Team = {
  __typename?: 'Team';
  /** The team's unique identifier. */
  id: Scalars['ID']['output'];
  /** Whether the team is a guest team */
  is_guest?: Maybe<Scalars['Boolean']['output']>;
  /** The team's name. */
  name: Scalars['String']['output'];
  /** The users who are the owners of the team. */
  owners: Array<User>;
  /** The team's picture url. */
  picture_url?: Maybe<Scalars['String']['output']>;
  /** The users in the team. */
  users?: Maybe<Array<Maybe<User>>>;
};


/** A team of users. */
export type TeamOwnersArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};


/** A team of users. */
export type TeamUsersArgs = {
  emails?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  kind?: InputMaybe<UserKind>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  newest_first?: InputMaybe<Scalars['Boolean']['input']>;
  non_active?: InputMaybe<Scalars['Boolean']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};

export type TeamValue = ColumnValue & {
  __typename?: 'TeamValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** ID of the assigned team */
  team_id?: Maybe<Scalars['Int']['output']>;
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** A monday.com template. */
export type Template = {
  __typename?: 'Template';
  /** The template process unique identifier for async operations. */
  process_id?: Maybe<Scalars['String']['output']>;
};

/** Text block formatting types. Controls visual appearance and semantic meaning. */
export enum TextBlock {
  /** Code styling */
  Code = 'CODE',
  /** Main document title (H1 equivalent) */
  LargeTitle = 'LARGE_TITLE',
  /** Section heading (H2 equivalent) */
  MediumTitle = 'MEDIUM_TITLE',
  /** Regular paragraph text */
  NormalText = 'NORMAL_TEXT',
  /** Indented quote/blockquote styling */
  Quote = 'QUOTE',
  /** Subsection heading (H3 equivalent) */
  SmallTitle = 'SMALL_TITLE'
}

/** Content for a text block */
export type TextBlockContent = DocBaseBlockContent & {
  __typename?: 'TextBlockContent';
  /** The alignment of the block content */
  alignment?: Maybe<BlockAlignment>;
  /** The text content in delta format - array of operations with insert content and optional attributes */
  delta_format: Array<Operation>;
  /** The text direction of the block content */
  direction?: Maybe<BlockDirection>;
};

/** Input for creating text blocks (normal text, titles, quote, code) */
export type TextBlockInput = {
  alignment?: InputMaybe<BlockAlignment>;
  /** The text content in delta format - array of operations with insert content and optional attributes */
  delta_format: Array<OperationInput>;
  direction?: InputMaybe<BlockDirection>;
  /** The parent block id to append the created block under. */
  parent_block_id?: InputMaybe<Scalars['String']['input']>;
  /** The specific type of text block (defaults to normal text) */
  text_block_type?: InputMaybe<TextBlock>;
};

export type TextValue = ColumnValue & {
  __typename?: 'TextValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** The column's textual value */
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

export type TimeTrackingHistoryItem = {
  __typename?: 'TimeTrackingHistoryItem';
  /** When the session was added to the cell */
  created_at: Scalars['Date']['output'];
  /** Only applicable if the session has ended */
  ended_at?: Maybe<Scalars['Date']['output']>;
  /** The identifier of an user which ended the tracking */
  ended_user_id?: Maybe<Scalars['ID']['output']>;
  /** A unique session identifier */
  id: Scalars['ID']['output'];
  /** Is true if the session end date was manually entered */
  manually_entered_end_date: Scalars['Boolean']['output'];
  /** Is true if the session end time was manually entered */
  manually_entered_end_time: Scalars['Boolean']['output'];
  /** Is true if the session start date was manually entered */
  manually_entered_start_date: Scalars['Boolean']['output'];
  /** Is true if the session start time was manually entered */
  manually_entered_start_time: Scalars['Boolean']['output'];
  /** Only applicable if the session was added by pressing the play button or via automation */
  started_at?: Maybe<Scalars['Date']['output']>;
  /** The identifier of an user which started the tracking */
  started_user_id?: Maybe<Scalars['ID']['output']>;
  /** The status of the session */
  status: Scalars['String']['output'];
  /** When the session was updated */
  updated_at?: Maybe<Scalars['Date']['output']>;
};

export type TimeTrackingValue = ColumnValue & {
  __typename?: 'TimeTrackingValue';
  /** The column that this value belongs to. */
  column: Column;
  /** Total duration of the time tracker */
  duration?: Maybe<Scalars['Int']['output']>;
  history: Array<TimeTrackingHistoryItem>;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** Whether the time tracker is running */
  running?: Maybe<Scalars['Boolean']['output']>;
  /** The date when the time tracker was started */
  started_at?: Maybe<Scalars['Date']['output']>;
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  value?: Maybe<Scalars['JSON']['output']>;
};

export type TimelineItem = {
  __typename?: 'TimelineItem';
  /** The board that the timeline item is on. */
  board?: Maybe<Board>;
  /** The content of the timeline item. */
  content?: Maybe<Scalars['String']['output']>;
  /** The creation date of the timeline item. */
  created_at: Scalars['Date']['output'];
  /** The external ID of the custom activity of the timeline item. */
  custom_activity_id?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['ID']['output']>;
  /** The item that the timeline item is on. */
  item?: Maybe<Item>;
  /** The title of the timeline item. */
  title?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  /** The user who created the timeline item. */
  user?: Maybe<User>;
};

export type TimelineItemTimeRange = {
  /** End time */
  end_timestamp: Scalars['ISO8601DateTime']['input'];
  /** Start time */
  start_timestamp: Scalars['ISO8601DateTime']['input'];
};

export type TimelineItemsPage = {
  __typename?: 'TimelineItemsPage';
  /** Cursor for fetching the next page */
  cursor?: Maybe<Scalars['String']['output']>;
  /** The timeline items in the current page */
  timeline_items: Array<TimelineItem>;
};

export type TimelineResponse = {
  __typename?: 'TimelineResponse';
  /** Paginated set of timeline items and a cursor to get the next page */
  timeline_items_page: TimelineItemsPage;
};


export type TimelineResponseTimeline_Items_PageArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type TimelineValue = ColumnValue & {
  __typename?: 'TimelineValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The start date of the timeline */
  from?: Maybe<Scalars['Date']['output']>;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** The range of dates representing the timeline (YYYY-MM-DD) */
  text?: Maybe<Scalars['String']['output']>;
  /** The end date of the timeline */
  to?: Maybe<Scalars['Date']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
  /** The visualization type for the timeline */
  visualization_type?: Maybe<Scalars['String']['output']>;
};

/** Represents a single automation trigger event */
export type TriggerEvent = {
  __typename?: 'TriggerEvent';
  /** Account identifier */
  accountId?: Maybe<Scalars['Int']['output']>;
  /** Number of billing actions counted for this trigger */
  billingActionsCount?: Maybe<Scalars['Int']['output']>;
  /** Creation time of the record */
  createdAt?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** Original creator feature reference ID */
  creatorAppFeatureReferenceId?: Maybe<Scalars['String']['output']>;
  /** Entity kind for the trigger (item / subitem / etc.) */
  entityKind?: Maybe<Scalars['String']['output']>;
  /** Error reason if the event failed */
  errorReason?: Maybe<Scalars['String']['output']>;
  /** Kind of the event */
  eventKind?: Maybe<Scalars['String']['output']>;
  /** Current state of the event */
  eventState?: Maybe<Scalars['String']['output']>;
  /** Host instance ID */
  hostInstanceId?: Maybe<Scalars['String']['output']>;
  /** Host type on which the automation is executed */
  hostType?: Maybe<Scalars['String']['output']>;
  /** Reignition subscription ID if trigger was reignited */
  reignitionSubscriptionId?: Maybe<Scalars['String']['output']>;
  /** Duration of the trigger in milliseconds */
  triggerDuration?: Maybe<Scalars['Float']['output']>;
  /** Timestamp (epoch) when trigger started */
  triggerStarted?: Maybe<Scalars['Float']['output']>;
  /** Date when trigger started */
  triggerStartedAt?: Maybe<Scalars['ISO8601DateTime']['output']>;
  /** Trigger UUID */
  triggerUuid?: Maybe<Scalars['String']['output']>;
  /** Waiting trigger name, when applicable */
  waitingForTriggerName?: Maybe<Scalars['String']['output']>;
};

/** Filters for querying trigger events */
export type TriggerEventsFiltersInput = {
  /** Filter by app names */
  appFilter?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Filter by automation IDs */
  automationIds?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** Billing action count field to filter by */
  billingActionCountField?: InputMaybe<Scalars['String']['input']>;
  /** Filter by board identifier */
  boardId?: InputMaybe<Scalars['String']['input']>;
  /** Filter by creator app feature reference ID */
  creatorAppFeatureReferenceId?: InputMaybe<Scalars['Int']['input']>;
  /** Date range filter */
  dateRange?: InputMaybe<DateRangeInput>;
  /** Filter by entity kind */
  entityKind?: InputMaybe<Scalars['String']['input']>;
  /** Whether to filter only monday automations */
  filterByEntity?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by host instance identifier */
  hostInstanceId?: InputMaybe<Scalars['String']['input']>;
  /** Filter by host type */
  hostType?: InputMaybe<Scalars['String']['input']>;
  /** True if entity is automation */
  isAutomationsEntity?: InputMaybe<Scalars['Boolean']['input']>;
  /** Whether workflow filter is applied */
  isWorkflowFilter?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by item identifier */
  itemId?: InputMaybe<Scalars['String']['input']>;
  /** Filter by event state */
  stateFilter?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Filter by status */
  statusFilter?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Filter by workflow entity IDs */
  workflowEntityIds?: InputMaybe<Array<Scalars['Int']['input']>>;
};

/** A page of trigger events and pagination data */
export type TriggerEventsPage = {
  __typename?: 'TriggerEventsPage';
  /** List of trigger events in the current page */
  triggerEvents?: Maybe<Array<TriggerEvent>>;
};

export type UnsupportedValue = ColumnValue & {
  __typename?: 'UnsupportedValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** Text representation of the column value. Note: Not all columns support textual value */
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** An update. */
export type Update = {
  __typename?: 'Update';
  /** The update's assets/files. */
  assets?: Maybe<Array<Maybe<Asset>>>;
  /** The update's html formatted body. */
  body: Scalars['String']['output'];
  /** The update's creation date. */
  created_at?: Maybe<Scalars['Date']['output']>;
  /** The update's creator. */
  creator?: Maybe<User>;
  /** The unique identifier of the update creator. */
  creator_id?: Maybe<Scalars['String']['output']>;
  edited_at: Scalars['Date']['output'];
  /** The update's unique identifier. */
  id: Scalars['ID']['output'];
  item?: Maybe<Item>;
  /** The update's item ID. */
  item_id?: Maybe<Scalars['String']['output']>;
  likes: Array<Like>;
  /** The original creation time of the update. */
  original_creation_date?: Maybe<Scalars['String']['output']>;
  pinned_to_top: Array<UpdatePin>;
  /** The update's replies. */
  replies?: Maybe<Array<Reply>>;
  /** The update's text body. */
  text_body?: Maybe<Scalars['String']['output']>;
  /** The update's last edit date. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  viewers: Array<Watcher>;
};


/** An update. */
export type UpdateViewersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};

/** Input for updating an app feature with its associated data and release information. */
export type UpdateAppFeatureInput = {
  /** The app feature data to update. This structure is dynamic and depends on the different app feature types. */
  data?: InputMaybe<Scalars['JSON']['input']>;
  /** The deployment data to update. https://developer.monday.com/apps/docs/deploy-your-app */
  deployment?: InputMaybe<AppFeatureReleaseInput>;
};

/** Input for updating an existing app. Creates draft version for live apps. */
export type UpdateAppInput = {
  /** Array of user IDs with access (replaces existing collaborators) */
  collaborators?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Detailed description of the app */
  description?: InputMaybe<Scalars['String']['input']>;
  /** App visibility type */
  kind?: InputMaybe<AppKind>;
  /** The display name of the app */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Array of permission scopes (replaces existing permissions) */
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
  /** URL-friendly identifier (only settable if app has no existing slug) */
  slug?: InputMaybe<Scalars['String']['input']>;
  /** Webhook endpoint URL */
  webhook_url?: InputMaybe<Scalars['String']['input']>;
};

/** Attributes for updating a board's position and location */
export type UpdateBoardHierarchyAttributesInput = {
  /** The ID of the account product where the board should be placed */
  account_product_id?: InputMaybe<Scalars['ID']['input']>;
  /** The ID of the folder where the board should be placed */
  folder_id?: InputMaybe<Scalars['ID']['input']>;
  /** The position of the board in the left pane */
  position?: InputMaybe<DynamicPosition>;
  /** The ID of the workspace where the board should be placed */
  workspace_id?: InputMaybe<Scalars['ID']['input']>;
};

/** Result of updating a board's position */
export type UpdateBoardHierarchyResult = {
  __typename?: 'UpdateBoardHierarchyResult';
  /** The updated board */
  board?: Maybe<Board>;
  /** A message about the operation result */
  message?: Maybe<Scalars['String']['output']>;
  /** Whether the operation was successful */
  success: Scalars['Boolean']['output'];
};

/** Input type for updating a single dependency relationship between pulses */
export type UpdateDependencyColumnInput = {
  /** The ID of the pulse to create or remove a dependency relationship with */
  linkedPulseId: Scalars['ID']['input'];
  /** Optional metadata containing dependency configuration (type and lag) */
  metadata?: InputMaybe<MetadataInput>;
};

export type UpdateDropdownColumnSettingsInput = {
  /** Maximum number of labels that can be selected when limit_select is enabled */
  label_limit_count?: InputMaybe<Scalars['Int']['input']>;
  labels: Array<UpdateDropdownLabelInput>;
  /** Whether to limit the number of labels that can be selected */
  limit_select?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateDropdownLabelInput = {
  id?: InputMaybe<Scalars['Int']['input']>;
  is_deactivated?: InputMaybe<Scalars['Boolean']['input']>;
  label: Scalars['String']['input'];
};

/** Attributes of the email domain to be updated. */
export type UpdateEmailDomainAttributesInput = {
  /** The new email domain. */
  new_domain: Scalars['String']['input'];
  /** The user identifiers (max 200) */
  user_ids: Array<Scalars['ID']['input']>;
};

/** Error that occurred while changing email domain. */
export type UpdateEmailDomainError = {
  __typename?: 'UpdateEmailDomainError';
  /** The error code. */
  code?: Maybe<UpdateEmailDomainErrorCode>;
  /** The error message. */
  message?: Maybe<Scalars['String']['output']>;
  /** The id of the user that caused the error. */
  user_id?: Maybe<Scalars['ID']['output']>;
};

/** Error codes that can occur while changing email domain. */
export enum UpdateEmailDomainErrorCode {
  CannotUpdateSelf = 'CANNOT_UPDATE_SELF',
  ExceedsBatchLimit = 'EXCEEDS_BATCH_LIMIT',
  Failed = 'FAILED',
  InvalidInput = 'INVALID_INPUT',
  UpdateEmailDomainError = 'UPDATE_EMAIL_DOMAIN_ERROR',
  UserNotFound = 'USER_NOT_FOUND'
}

/** Result of updating the email domain for the specified users. */
export type UpdateEmailDomainResult = {
  __typename?: 'UpdateEmailDomainResult';
  /** Errors that occurred during the update. */
  errors?: Maybe<Array<UpdateEmailDomainError>>;
  /** The users for which the email domain was updated. */
  updated_users?: Maybe<Array<User>>;
};

/** Represents the response when adding an object to a list */
export type UpdateFavoriteResultType = {
  __typename?: 'UpdateFavoriteResultType';
  /** The favorite item that its position was updated */
  favorite?: Maybe<GraphqlHierarchyObjectItem>;
};

export type UpdateFormInput = {
  /** Optional description text providing context about the form purpose. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Ordered array of dehydrated questions, object only including each question ID, for reordering. Must include all existing question IDs. */
  questions?: InputMaybe<Array<QuestionOrderInput>>;
  /** The title text for the form. Must be at least 1 character long. */
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateFormSettingsInput = {
  /** Object containing accessibility options such as language, alt text, etc. */
  accessibility?: InputMaybe<FormAccessibilityInput>;
  /** Object containing visual styling including colors, layout, fonts, and branding elements. */
  appearance?: InputMaybe<FormAppearanceInput>;
  /** Object containing form features including but not limited to password protection, response limits, login requirements, etc. */
  features?: InputMaybe<FormFeaturesInput>;
};

export type UpdateFormTagInput = {
  /** The value of the tag */
  value?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateMention = {
  /** The object id. */
  id: Scalars['ID']['input'];
  type: MentionType;
};

export type UpdateObjectHierarchyPositionInput = {
  /** The new folder ID to move the object to, if necessary */
  newFolder?: InputMaybe<Scalars['ID']['input']>;
  /** The new position for the object */
  newPosition?: InputMaybe<ObjectDynamicPositionInput>;
  /** The favorite's object to update */
  object: HierarchyObjectIdInputType;
};

/** Input for updating an object */
export type UpdateObjectInput = {
  /** The new description for the object */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The new name for the object. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The new privacy kind for the object. */
  privacy_kind?: InputMaybe<PrivacyKind>;
};

/** Result type for updating an overview's hierarchy */
export type UpdateOverviewHierarchy = {
  __typename?: 'UpdateOverviewHierarchy';
  /** Message about the operation result */
  message: Scalars['String']['output'];
  /** The updated overview */
  overview?: Maybe<Overview>;
  /** Whether the operation was successful */
  success: Scalars['Boolean']['output'];
};

/** Attributes for updating an overview's hierarchy and location */
export type UpdateOverviewHierarchyAttributesInput = {
  /** The ID of the account product where the overview should be placed */
  account_product_id?: InputMaybe<Scalars['ID']['input']>;
  /** The ID of the folder where the overview should be placed */
  folder_id?: InputMaybe<Scalars['ID']['input']>;
  /** The position of the overview in the left pane */
  position?: InputMaybe<DynamicPosition>;
  /** The ID of the workspace where the overview should be placed */
  workspace_id?: InputMaybe<Scalars['ID']['input']>;
};

/** The pin to top data of the update. */
export type UpdatePin = {
  __typename?: 'UpdatePin';
  item_id: Scalars['ID']['output'];
};

export type UpdateQuestionInput = {
  /** Optional explanatory text providing additional context, instructions, or examples for the question. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Boolean indicating if the question must be answered before form submission. */
  required?: InputMaybe<Scalars['Boolean']['input']>;
  /** Question-specific configuration object that varies by question type. */
  settings?: InputMaybe<FormQuestionSettingsInput>;
  /** The question text displayed to respondents. Must be at least 1 character long and clearly indicate the expected response. */
  title?: InputMaybe<Scalars['String']['input']>;
  /** The question type determining input behavior and validation (e.g., "text", "email", "single_select", "multi_select"). */
  type: FormQuestionType;
  /** Boolean controlling question visibility to respondents. Hidden questions remain in form structure but are not displayed. */
  visible?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateStatusColumnSettingsInput = {
  labels: Array<UpdateStatusLabelInput>;
};

export type UpdateStatusLabelInput = {
  color: StatusColumnColors;
  description?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['Int']['input']>;
  index: Scalars['Int']['input'];
  is_deactivated?: InputMaybe<Scalars['Boolean']['input']>;
  is_done?: InputMaybe<Scalars['Boolean']['input']>;
  label: Scalars['String']['input'];
};

/** Error that occurred while updating users attributes. */
export type UpdateUserAttributesError = {
  __typename?: 'UpdateUserAttributesError';
  /** The error code. */
  code?: Maybe<UpdateUserAttributesErrorCode>;
  /** The error message. */
  message?: Maybe<Scalars['String']['output']>;
  /** The id of the user that caused the error. */
  user_id?: Maybe<Scalars['ID']['output']>;
};

/** Error codes that can occur while updating user attributes. */
export enum UpdateUserAttributesErrorCode {
  InvalidField = 'INVALID_FIELD'
}

/** The result of updating users attributes. */
export type UpdateUserAttributesResult = {
  __typename?: 'UpdateUserAttributesResult';
  /** Errors that occurred during the update. */
  errors?: Maybe<Array<UpdateUserAttributesError>>;
  /** The users that were updated. */
  updated_users?: Maybe<Array<User>>;
};

/** Error that occurred during updating users role. */
export type UpdateUsersRoleError = {
  __typename?: 'UpdateUsersRoleError';
  /** The error code. */
  code?: Maybe<UpdateUsersRoleErrorCode>;
  /** The error message. */
  message?: Maybe<Scalars['String']['output']>;
  /** The id of the user that caused the error. */
  user_id?: Maybe<Scalars['ID']['output']>;
};

/** Error codes for updating users roles. */
export enum UpdateUsersRoleErrorCode {
  CannotUpdateSelf = 'CANNOT_UPDATE_SELF',
  ExceedsBatchLimit = 'EXCEEDS_BATCH_LIMIT',
  Failed = 'FAILED',
  InvalidInput = 'INVALID_INPUT',
  UserNotFound = 'USER_NOT_FOUND'
}

/** Result of updating users role. */
export type UpdateUsersRoleResult = {
  __typename?: 'UpdateUsersRoleResult';
  /** Errors that occurred during updating users role. */
  errors?: Maybe<Array<UpdateUsersRoleError>>;
  /** The users that were updated. */
  updated_users?: Maybe<Array<User>>;
};

/** Attributes of a workspace to update */
export type UpdateWorkspaceAttributesInput = {
  /** The target account product's ID to move the workspace to */
  account_product_id?: InputMaybe<Scalars['ID']['input']>;
  /** The description of the workspace to update */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The kind of the workspace to update (open / closed / template) */
  kind?: InputMaybe<WorkspaceKind>;
  /** The name of the workspace to update */
  name?: InputMaybe<Scalars['String']['input']>;
};

/** A monday.com user. */
export type User = {
  __typename?: 'User';
  /** The user's account. */
  account: Account;
  /** The products the user is assigned to. */
  account_products?: Maybe<Array<AccountProduct>>;
  /** The user's birthday. */
  birthday?: Maybe<Scalars['Date']['output']>;
  /** The user's country code. */
  country_code?: Maybe<Scalars['String']['output']>;
  /** The user's creation date. */
  created_at?: Maybe<Scalars['Date']['output']>;
  /** The current user's language */
  current_language?: Maybe<Scalars['String']['output']>;
  /** The custom field metas of the user profile. */
  custom_field_metas?: Maybe<Array<Maybe<CustomFieldMetas>>>;
  /** The custom field values of the user profile. */
  custom_field_values?: Maybe<Array<Maybe<CustomFieldValue>>>;
  /** The user's email. */
  email: Scalars['String']['output'];
  /** Is the user enabled or not. */
  enabled: Scalars['Boolean']['output'];
  /** The token of the user for email to board. */
  encrypt_api_token?: Maybe<Scalars['String']['output']>;
  /** The user's unique identifier. */
  id: Scalars['ID']['output'];
  /** Is the user an account admin. */
  is_admin?: Maybe<Scalars['Boolean']['output']>;
  /** Is the user a guest or not. */
  is_guest?: Maybe<Scalars['Boolean']['output']>;
  /** Is the user a pending user */
  is_pending?: Maybe<Scalars['Boolean']['output']>;
  /** Is user verified his email. */
  is_verified?: Maybe<Scalars['Boolean']['output']>;
  /** Is the user a view only user or not. */
  is_view_only?: Maybe<Scalars['Boolean']['output']>;
  /** The date the user joined the account. */
  join_date?: Maybe<Scalars['Date']['output']>;
  /** Last date & time when user was active */
  last_activity?: Maybe<Scalars['Date']['output']>;
  /** The user's location. */
  location?: Maybe<Scalars['String']['output']>;
  /** The user's mobile phone number. */
  mobile_phone?: Maybe<Scalars['String']['output']>;
  /** The user's name. */
  name: Scalars['String']['output'];
  /** The user's out of office status. */
  out_of_office?: Maybe<OutOfOffice>;
  /** The user's phone number. */
  phone?: Maybe<Scalars['String']['output']>;
  /** The user's photo in the original size. */
  photo_original?: Maybe<Scalars['String']['output']>;
  /** The user's photo in small size (150x150). */
  photo_small?: Maybe<Scalars['String']['output']>;
  /** The user's photo in thumbnail size (100x100). */
  photo_thumb?: Maybe<Scalars['String']['output']>;
  /** The user's photo in small thumbnail size (50x50). */
  photo_thumb_small?: Maybe<Scalars['String']['output']>;
  /** The user's photo in tiny size (30x30). */
  photo_tiny?: Maybe<Scalars['String']['output']>;
  /** The product to which the user signed up to first. */
  sign_up_product_kind?: Maybe<Scalars['String']['output']>;
  /** The teams the user is a member in. */
  teams?: Maybe<Array<Maybe<Team>>>;
  /** The user's timezone identifier. */
  time_zone_identifier?: Maybe<Scalars['String']['output']>;
  /** The user's title. */
  title?: Maybe<Scalars['String']['output']>;
  /** The user's profile url. */
  url: Scalars['String']['output'];
  /** The user’s utc hours difference. */
  utc_hours_diff?: Maybe<Scalars['Int']['output']>;
};


/** A monday.com user. */
export type UserTeamsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** The attributes to update for a user. */
export type UserAttributesInput = {
  /** The birthday of the user. */
  birthday?: InputMaybe<Scalars['String']['input']>;
  /** The department of the user. */
  department?: InputMaybe<Scalars['String']['input']>;
  /** The email of the user. */
  email?: InputMaybe<Scalars['String']['input']>;
  /** The join date of the user. */
  join_date?: InputMaybe<Scalars['String']['input']>;
  /** The location of the user. */
  location?: InputMaybe<Scalars['String']['input']>;
  /** The mobile phone of the user. */
  mobile_phone?: InputMaybe<Scalars['String']['input']>;
  /** The name of the user. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The phone of the user. */
  phone?: InputMaybe<Scalars['String']['input']>;
  /** The title of the user. */
  title?: InputMaybe<Scalars['String']['input']>;
};

/** The possibilities for a user kind. */
export enum UserKind {
  /** All users in account. */
  All = 'all',
  /** Only guests. */
  Guests = 'guests',
  /** Only company members. */
  NonGuests = 'non_guests',
  /** All non pending members. */
  NonPending = 'non_pending'
}

/** The role of the user. */
export enum UserRole {
  Admin = 'ADMIN',
  Guest = 'GUEST',
  Member = 'MEMBER',
  ViewOnly = 'VIEW_ONLY'
}

export type UserUpdateInput = {
  user_attribute_updates: UserAttributesInput;
  user_id: Scalars['ID']['input'];
};

export type Validations = {
  __typename?: 'Validations';
  /** Array of required column IDs */
  required_column_ids?: Maybe<Array<Scalars['String']['output']>>;
  /** Validation rules */
  rules?: Maybe<Scalars['JSON']['output']>;
};

export enum ValidationsEntityType {
  Board = 'board'
}

/** An object containing the API version details */
export type Version = {
  __typename?: 'Version';
  /** The display name of the API version */
  display_name: Scalars['String']['output'];
  /** The type of the API version */
  kind: VersionKind;
  /** Version string that can be used in API-Version header */
  value: Scalars['String']['output'];
};

/** All possible API version types */
export enum VersionKind {
  /** Current version */
  Current = 'current',
  /** No longer supported version. Migrate to current version as soon as possible */
  Deprecated = 'deprecated',
  /** Bleeding-edge rolling version that constantly changes */
  Dev = 'dev',
  /** Previous version. Migrate to current version as soon as possible */
  Maintenance = 'maintenance',
  /** Old version that will be deprecated in January. Migrate to current version as soon as possible */
  OldMaintenance = 'old__maintenance',
  /** Old version that will be deprecated in January. Migrate to current version as soon as possible */
  OldPreviousMaintenance = 'old_previous_maintenance',
  /** Older version that will be deprecated in January. Migrate to current version as soon as possible */
  PreviousMaintenance = 'previous_maintenance',
  /** Next version */
  ReleaseCandidate = 'release_candidate'
}

/** Input for creating video blocks */
export type VideoBlockInput = {
  /** The parent block id to append the created block under. */
  parent_block_id?: InputMaybe<Scalars['String']['input']>;
  /** The raw URL of the video */
  raw_url: Scalars['String']['input'];
  /** The width of the video */
  width?: InputMaybe<Scalars['Int']['input']>;
};

/** Content for a video block */
export type VideoContent = DocBaseBlockContent & {
  __typename?: 'VideoContent';
  /** The alignment of the block content */
  alignment?: Maybe<BlockAlignment>;
  /** The text direction of the block content */
  direction?: Maybe<BlockDirection>;
  /** The raw URL of the video */
  url: Scalars['String']['output'];
  /** The width of the video */
  width?: Maybe<Scalars['Int']['output']>;
};

/** Available view types for board displays */
export enum ViewKind {
  /** App view for feature-specific board display */
  App = 'APP',
  /** Dashboard view for displaying dashboard view */
  Dashboard = 'DASHBOARD',
  /** Form view for input and data entry */
  Form = 'FORM',
  /** Table view for displaying items in a structured table format */
  Table = 'TABLE'
}

/** Type of mutation operation */
export enum ViewMutationKind {
  /** Create operation */
  Create = 'CREATE',
  /** Update operation */
  Update = 'UPDATE'
}

export type VoteValue = ColumnValue & {
  __typename?: 'VoteValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
  /** The total number of votes */
  vote_count: Scalars['Int']['output'];
  /** A list of IDs of users who voted */
  voter_ids: Array<Scalars['ID']['output']>;
  /** A list of users who voted */
  voters: Array<User>;
};

/** The viewer of the update. */
export type Watcher = {
  __typename?: 'Watcher';
  medium: Scalars['String']['output'];
  user?: Maybe<User>;
  user_id: Scalars['ID']['output'];
};

/** Monday webhooks */
export type Webhook = {
  __typename?: 'Webhook';
  /** The webhooks's board id. */
  board_id: Scalars['ID']['output'];
  /** The webhooks's config. */
  config?: Maybe<Scalars['String']['output']>;
  /** The event webhook will listen to */
  event: WebhookEventType;
  /** The webhooks's unique identifier. */
  id: Scalars['ID']['output'];
};

/** The webhook's target type. */
export enum WebhookEventType {
  /** Column value changed on board */
  ChangeColumnValue = 'change_column_value',
  /** An item name changed on board */
  ChangeName = 'change_name',
  /** Specific Column value changed on board */
  ChangeSpecificColumnValue = 'change_specific_column_value',
  /** Status column value changed on board */
  ChangeStatusColumnValue = 'change_status_column_value',
  /** Column value changed on board subitem */
  ChangeSubitemColumnValue = 'change_subitem_column_value',
  /** An subitem name changed on board */
  ChangeSubitemName = 'change_subitem_name',
  /** Column created on a board */
  CreateColumn = 'create_column',
  /** An item was created on board */
  CreateItem = 'create_item',
  /** A subitem was created on a board */
  CreateSubitem = 'create_subitem',
  /** An update was posted on board subitem */
  CreateSubitemUpdate = 'create_subitem_update',
  /** An update was posted on board item */
  CreateUpdate = 'create_update',
  /** An update was deleted from board item */
  DeleteUpdate = 'delete_update',
  /** An update was edited on board item */
  EditUpdate = 'edit_update',
  /** An item was archived on a board */
  ItemArchived = 'item_archived',
  /** An item was deleted from a board */
  ItemDeleted = 'item_deleted',
  /** An item is moved to any group */
  ItemMovedToAnyGroup = 'item_moved_to_any_group',
  /** An item is moved to a specific group */
  ItemMovedToSpecificGroup = 'item_moved_to_specific_group',
  /** An item restored back to board */
  ItemRestored = 'item_restored',
  /** A subitem is moved from one parent to another */
  MoveSubitem = 'move_subitem',
  /** A subitem was archived on a board */
  SubitemArchived = 'subitem_archived',
  /** A subitem was deleted from a board */
  SubitemDeleted = 'subitem_deleted'
}

export type WeekValue = ColumnValue & {
  __typename?: 'WeekValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The end date of the week */
  end_date?: Maybe<Scalars['Date']['output']>;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  /** The start date of the week */
  start_date?: Maybe<Scalars['Date']['output']>;
  /** The range of dates representing the week (YYYY-MM-DD) */
  text?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/** Data visualization object. */
export type Widget = {
  __typename?: 'Widget';
  /** Unique identifier of this widget. */
  id?: Maybe<Scalars['ID']['output']>;
  /** The type of widget (CHART, NUMBER, BATTERY). */
  kind?: Maybe<ExternalWidget>;
  /** Widget label (UTF-8 chars). */
  name?: Maybe<Scalars['String']['output']>;
  /** Parent container where the widget is placed. */
  parent?: Maybe<WidgetParentOutput>;
};

/** Parent container input where the widget will be placed. */
export type WidgetParentInput = {
  /** The ID of the parent container. */
  id: Scalars['ID']['input'];
  /** The type of parent container (DASHBOARD or BOARD_VIEW) */
  kind: WidgetParentKind;
};

/** The kind of parent container where the widget will be placed. */
export enum WidgetParentKind {
  /** Widget placed in a specific board view */
  BoardView = 'BOARD_VIEW',
  /** Widget placed in a dashboard */
  Dashboard = 'DASHBOARD'
}

/** Parent container information in widget responses. Indicates where the widget is placed. */
export type WidgetParentOutput = {
  __typename?: 'WidgetParentOutput';
  /** The ID of the parent container. */
  id?: Maybe<Scalars['ID']['output']>;
  /** The type of parent container (DASHBOARD or BOARD_VIEW) */
  kind?: Maybe<WidgetParentKind>;
};

/** Information about a widget type and its JSON schema */
export type WidgetSchemaInfo = {
  __typename?: 'WidgetSchemaInfo';
  /** The JSON schema (draft 7) for this widget type */
  schema?: Maybe<Scalars['JSON']['output']>;
  /** The widget kind (e.g., Chart, Number, Battery) */
  widget_type?: Maybe<ExternalWidget>;
};

/** A monday.com workspace. */
export type Workspace = {
  __typename?: 'Workspace';
  /** The account product that contains workspace. */
  account_product?: Maybe<AccountProduct>;
  /** The workspace's creation date. */
  created_at?: Maybe<Scalars['Date']['output']>;
  /** The workspace's description. */
  description?: Maybe<Scalars['String']['output']>;
  /** The workspace's unique identifier. */
  id?: Maybe<Scalars['ID']['output']>;
  /** Returns true if it is the default workspace of the product or account */
  is_default_workspace?: Maybe<Scalars['Boolean']['output']>;
  /** The workspace's kind (open / closed / template). */
  kind?: Maybe<WorkspaceKind>;
  /** The workspace's name. */
  name: Scalars['String']['output'];
  /** The workspace's user owners. */
  owners_subscribers?: Maybe<Array<Maybe<User>>>;
  /** The workspace's settings. */
  settings?: Maybe<WorkspaceSettings>;
  /** The workspace's state (all / active / archived / deleted). */
  state?: Maybe<State>;
  /** The workspace's team owners. */
  team_owners_subscribers?: Maybe<Array<Team>>;
  /** The teams subscribed to the workspace. */
  teams_subscribers?: Maybe<Array<Maybe<Team>>>;
  /** The users subscribed to the workspace */
  users_subscribers?: Maybe<Array<Maybe<User>>>;
};


/** A monday.com workspace. */
export type WorkspaceOwners_SubscribersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};


/** A monday.com workspace. */
export type WorkspaceTeam_Owners_SubscribersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};


/** A monday.com workspace. */
export type WorkspaceTeams_SubscribersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};


/** A monday.com workspace. */
export type WorkspaceUsers_SubscribersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
};

/** The workspace's icon. */
export type WorkspaceIcon = {
  __typename?: 'WorkspaceIcon';
  /** The icon color in hex value. Used as a background for the image. */
  color?: Maybe<Scalars['String']['output']>;
  /**
   * The public image URL, which is temporary in the case of a file that was
   * uploaded by the user, so you'll need to pull a new version at least once an hour.
   *                                In case it is null, you can use the first letter of the workspace name.
   */
  image?: Maybe<Scalars['String']['output']>;
};

/** The workspace kinds available. */
export enum WorkspaceKind {
  /** Closed workspace, available to enterprise only. */
  Closed = 'closed',
  /** Open workspace. */
  Open = 'open',
  /** Template workspace. */
  Template = 'template'
}

/** The workspace's settings. */
export type WorkspaceSettings = {
  __typename?: 'WorkspaceSettings';
  /** The workspace icon. */
  icon?: Maybe<WorkspaceIcon>;
};

/** The workspace subscriber kind. */
export enum WorkspaceSubscriberKind {
  /** Workspace owner. */
  Owner = 'owner',
  /** Workspace subscriber. */
  Subscriber = 'subscriber'
}

/** Options to order by. */
export enum WorkspacesOrderBy {
  /** The rank order of the workspace creation time (desc). */
  CreatedAt = 'created_at'
}

export type WorldClockValue = ColumnValue & {
  __typename?: 'WorldClockValue';
  /** The column that this value belongs to. */
  column: Column;
  /** The column's unique identifier. */
  id: Scalars['ID']['output'];
  text?: Maybe<Scalars['String']['output']>;
  /** Timezone */
  timezone?: Maybe<Scalars['String']['output']>;
  /** The column's type. */
  type: ColumnType;
  /** The date when column value was last updated. */
  updated_at?: Maybe<Scalars['Date']['output']>;
  /** The column's raw value in JSON format. */
  value?: Maybe<Scalars['JSON']['output']>;
};

/**
 * A Directive provides a way to describe alternate runtime execution and type validation behavior in a GraphQL document.
 *
 * In some cases, you need to provide options to alter GraphQL's execution behavior in ways field arguments will not suffice, such as conditionally including or skipping a field. Directives provide this by describing additional information to the executor.
 */
export type __Directive = {
  __typename?: '__Directive';
  name: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  isRepeatable: Scalars['Boolean']['output'];
  locations: Array<__DirectiveLocation>;
  args: Array<__InputValue>;
};


/**
 * A Directive provides a way to describe alternate runtime execution and type validation behavior in a GraphQL document.
 *
 * In some cases, you need to provide options to alter GraphQL's execution behavior in ways field arguments will not suffice, such as conditionally including or skipping a field. Directives provide this by describing additional information to the executor.
 */
export type __DirectiveArgsArgs = {
  includeDeprecated?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A Directive can be adjacent to many parts of the GraphQL language, a __DirectiveLocation describes one such possible adjacencies. */
export enum __DirectiveLocation {
  /** Location adjacent to a query operation. */
  Query = 'QUERY',
  /** Location adjacent to a mutation operation. */
  Mutation = 'MUTATION',
  /** Location adjacent to a subscription operation. */
  Subscription = 'SUBSCRIPTION',
  /** Location adjacent to a field. */
  Field = 'FIELD',
  /** Location adjacent to a fragment definition. */
  FragmentDefinition = 'FRAGMENT_DEFINITION',
  /** Location adjacent to a fragment spread. */
  FragmentSpread = 'FRAGMENT_SPREAD',
  /** Location adjacent to an inline fragment. */
  InlineFragment = 'INLINE_FRAGMENT',
  /** Location adjacent to a variable definition. */
  VariableDefinition = 'VARIABLE_DEFINITION',
  /** Location adjacent to a schema definition. */
  Schema = 'SCHEMA',
  /** Location adjacent to a scalar definition. */
  Scalar = 'SCALAR',
  /** Location adjacent to an object type definition. */
  Object = 'OBJECT',
  /** Location adjacent to a field definition. */
  FieldDefinition = 'FIELD_DEFINITION',
  /** Location adjacent to an argument definition. */
  ArgumentDefinition = 'ARGUMENT_DEFINITION',
  /** Location adjacent to an interface definition. */
  Interface = 'INTERFACE',
  /** Location adjacent to a union definition. */
  Union = 'UNION',
  /** Location adjacent to an enum definition. */
  Enum = 'ENUM',
  /** Location adjacent to an enum value definition. */
  EnumValue = 'ENUM_VALUE',
  /** Location adjacent to an input object type definition. */
  InputObject = 'INPUT_OBJECT',
  /** Location adjacent to an input object field definition. */
  InputFieldDefinition = 'INPUT_FIELD_DEFINITION'
}

/** One possible value for a given Enum. Enum values are unique values, not a placeholder for a string or numeric value. However an Enum value is returned in a JSON response as a string. */
export type __EnumValue = {
  __typename?: '__EnumValue';
  name: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  isDeprecated: Scalars['Boolean']['output'];
  deprecationReason?: Maybe<Scalars['String']['output']>;
};

/** Object and Interface types are described by a list of Fields, each of which has a name, potentially a list of arguments, and a return type. */
export type __Field = {
  __typename?: '__Field';
  name: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  args: Array<__InputValue>;
  type: __Type;
  isDeprecated: Scalars['Boolean']['output'];
  deprecationReason?: Maybe<Scalars['String']['output']>;
};


/** Object and Interface types are described by a list of Fields, each of which has a name, potentially a list of arguments, and a return type. */
export type __FieldArgsArgs = {
  includeDeprecated?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Arguments provided to Fields or Directives and the input fields of an InputObject are represented as Input Values which describe their type and optionally a default value. */
export type __InputValue = {
  __typename?: '__InputValue';
  name: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  type: __Type;
  /** A GraphQL-formatted string representing the default value for this input value. */
  defaultValue?: Maybe<Scalars['String']['output']>;
  isDeprecated: Scalars['Boolean']['output'];
  deprecationReason?: Maybe<Scalars['String']['output']>;
};

/** A GraphQL Schema defines the capabilities of a GraphQL server. It exposes all available types and directives on the server, as well as the entry points for query, mutation, and subscription operations. */
export type __Schema = {
  __typename?: '__Schema';
  description?: Maybe<Scalars['String']['output']>;
  /** A list of all types supported by this server. */
  types: Array<__Type>;
  /** The type that query operations will be rooted at. */
  queryType: __Type;
  /** If this server supports mutation, the type that mutation operations will be rooted at. */
  mutationType?: Maybe<__Type>;
  /** If this server support subscription, the type that subscription operations will be rooted at. */
  subscriptionType?: Maybe<__Type>;
  /** A list of all directives supported by this server. */
  directives: Array<__Directive>;
};

/**
 * The fundamental unit of any GraphQL Schema is the type. There are many kinds of types in GraphQL as represented by the `__TypeKind` enum.
 *
 * Depending on the kind of a type, certain fields describe information about that type. Scalar types provide no information beyond a name, description and optional `specifiedByURL`, while Enum types provide their values. Object and Interface types provide the fields they describe. Abstract types, Union and Interface, provide the Object types possible at runtime. List and NonNull types compose other types.
 */
export type __Type = {
  __typename?: '__Type';
  kind: __TypeKind;
  name?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  specifiedByURL?: Maybe<Scalars['String']['output']>;
  fields?: Maybe<Array<__Field>>;
  interfaces?: Maybe<Array<__Type>>;
  possibleTypes?: Maybe<Array<__Type>>;
  enumValues?: Maybe<Array<__EnumValue>>;
  inputFields?: Maybe<Array<__InputValue>>;
  ofType?: Maybe<__Type>;
};


/**
 * The fundamental unit of any GraphQL Schema is the type. There are many kinds of types in GraphQL as represented by the `__TypeKind` enum.
 *
 * Depending on the kind of a type, certain fields describe information about that type. Scalar types provide no information beyond a name, description and optional `specifiedByURL`, while Enum types provide their values. Object and Interface types provide the fields they describe. Abstract types, Union and Interface, provide the Object types possible at runtime. List and NonNull types compose other types.
 */
export type __TypeFieldsArgs = {
  includeDeprecated?: InputMaybe<Scalars['Boolean']['input']>;
};


/**
 * The fundamental unit of any GraphQL Schema is the type. There are many kinds of types in GraphQL as represented by the `__TypeKind` enum.
 *
 * Depending on the kind of a type, certain fields describe information about that type. Scalar types provide no information beyond a name, description and optional `specifiedByURL`, while Enum types provide their values. Object and Interface types provide the fields they describe. Abstract types, Union and Interface, provide the Object types possible at runtime. List and NonNull types compose other types.
 */
export type __TypeEnumValuesArgs = {
  includeDeprecated?: InputMaybe<Scalars['Boolean']['input']>;
};


/**
 * The fundamental unit of any GraphQL Schema is the type. There are many kinds of types in GraphQL as represented by the `__TypeKind` enum.
 *
 * Depending on the kind of a type, certain fields describe information about that type. Scalar types provide no information beyond a name, description and optional `specifiedByURL`, while Enum types provide their values. Object and Interface types provide the fields they describe. Abstract types, Union and Interface, provide the Object types possible at runtime. List and NonNull types compose other types.
 */
export type __TypeInputFieldsArgs = {
  includeDeprecated?: InputMaybe<Scalars['Boolean']['input']>;
};

/** An enum describing what kind of type a given `__Type` is. */
export enum __TypeKind {
  /** Indicates this type is a scalar. */
  Scalar = 'SCALAR',
  /** Indicates this type is an object. `fields` and `interfaces` are valid fields. */
  Object = 'OBJECT',
  /** Indicates this type is an interface. `fields`, `interfaces`, and `possibleTypes` are valid fields. */
  Interface = 'INTERFACE',
  /** Indicates this type is a union. `possibleTypes` is a valid field. */
  Union = 'UNION',
  /** Indicates this type is an enum. `enumValues` is a valid field. */
  Enum = 'ENUM',
  /** Indicates this type is an input object. `inputFields` is a valid field. */
  InputObject = 'INPUT_OBJECT',
  /** Indicates this type is a list. `ofType` is a valid field. */
  List = 'LIST',
  /** Indicates this type is a non-null. `ofType` is a valid field. */
  NonNull = 'NON_NULL'
}

export type GetSprintsByIdsQueryVariables = Exact<{
  ids?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type GetSprintsByIdsQuery = { __typename?: 'Query', items?: Array<{ __typename?: 'Item', id: string, name: string, board?: { __typename?: 'Board', id: string } | null, column_values: Array<{ __typename: 'BatteryValue', id: string, type: ColumnType } | { __typename: 'BoardRelationValue', id: string, type: ColumnType } | { __typename: 'ButtonValue', id: string, type: ColumnType } | { __typename: 'CheckboxValue', checked?: boolean | null, id: string, type: ColumnType } | { __typename: 'ColorPickerValue', id: string, type: ColumnType } | { __typename: 'CountryValue', id: string, type: ColumnType } | { __typename: 'CreationLogValue', id: string, type: ColumnType } | { __typename: 'DateValue', date?: string | null, id: string, type: ColumnType } | { __typename: 'DependencyValue', id: string, type: ColumnType } | { __typename: 'DirectDocValue', id: string, type: ColumnType } | { __typename: 'DocValue', id: string, type: ColumnType, file?: { __typename?: 'FileDocValue', doc: { __typename?: 'Document', object_id: string } } | null } | { __typename: 'DropdownValue', id: string, type: ColumnType } | { __typename: 'EmailValue', id: string, type: ColumnType } | { __typename: 'FileValue', id: string, type: ColumnType } | { __typename: 'FormulaValue', id: string, type: ColumnType } | { __typename: 'GroupValue', id: string, type: ColumnType } | { __typename: 'HourValue', id: string, type: ColumnType } | { __typename: 'IntegrationValue', id: string, type: ColumnType } | { __typename: 'ItemIdValue', id: string, type: ColumnType } | { __typename: 'LastUpdatedValue', id: string, type: ColumnType } | { __typename: 'LinkValue', id: string, type: ColumnType } | { __typename: 'LocationValue', id: string, type: ColumnType } | { __typename: 'LongTextValue', id: string, type: ColumnType } | { __typename: 'MirrorValue', id: string, type: ColumnType } | { __typename: 'NumbersValue', id: string, type: ColumnType } | { __typename: 'PeopleValue', id: string, type: ColumnType } | { __typename: 'PersonValue', id: string, type: ColumnType } | { __typename: 'PhoneValue', id: string, type: ColumnType } | { __typename: 'ProgressValue', id: string, type: ColumnType } | { __typename: 'RatingValue', id: string, type: ColumnType } | { __typename: 'StatusValue', id: string, type: ColumnType } | { __typename: 'SubtasksValue', id: string, type: ColumnType } | { __typename: 'TagsValue', id: string, type: ColumnType } | { __typename: 'TeamValue', id: string, type: ColumnType } | { __typename: 'TextValue', value?: any | null, id: string, type: ColumnType } | { __typename: 'TimeTrackingValue', id: string, type: ColumnType } | { __typename: 'TimelineValue', from?: any | null, to?: any | null, id: string, type: ColumnType } | { __typename: 'UnsupportedValue', id: string, type: ColumnType } | { __typename: 'VoteValue', id: string, type: ColumnType } | { __typename: 'WeekValue', id: string, type: ColumnType } | { __typename: 'WorldClockValue', id: string, type: ColumnType }> } | null> | null };

export type GetSprintsBoardItemsWithColumnsQueryVariables = Exact<{
  boardId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetSprintsBoardItemsWithColumnsQuery = { __typename?: 'Query', boards?: Array<{ __typename?: 'Board', items_page: { __typename?: 'ItemsResponse', items: Array<{ __typename?: 'Item', id: string, name: string, column_values: Array<{ __typename: 'BatteryValue', id: string, type: ColumnType } | { __typename: 'BoardRelationValue', id: string, type: ColumnType } | { __typename: 'ButtonValue', id: string, type: ColumnType } | { __typename: 'CheckboxValue', checked?: boolean | null, id: string, type: ColumnType } | { __typename: 'ColorPickerValue', id: string, type: ColumnType } | { __typename: 'CountryValue', id: string, type: ColumnType } | { __typename: 'CreationLogValue', id: string, type: ColumnType } | { __typename: 'DateValue', date?: string | null, id: string, type: ColumnType } | { __typename: 'DependencyValue', id: string, type: ColumnType } | { __typename: 'DirectDocValue', id: string, type: ColumnType } | { __typename: 'DocValue', id: string, type: ColumnType, file?: { __typename?: 'FileDocValue', doc: { __typename?: 'Document', object_id: string } } | null } | { __typename: 'DropdownValue', id: string, type: ColumnType } | { __typename: 'EmailValue', id: string, type: ColumnType } | { __typename: 'FileValue', id: string, type: ColumnType } | { __typename: 'FormulaValue', id: string, type: ColumnType } | { __typename: 'GroupValue', id: string, type: ColumnType } | { __typename: 'HourValue', id: string, type: ColumnType } | { __typename: 'IntegrationValue', id: string, type: ColumnType } | { __typename: 'ItemIdValue', id: string, type: ColumnType } | { __typename: 'LastUpdatedValue', id: string, type: ColumnType } | { __typename: 'LinkValue', id: string, type: ColumnType } | { __typename: 'LocationValue', id: string, type: ColumnType } | { __typename: 'LongTextValue', id: string, type: ColumnType } | { __typename: 'MirrorValue', id: string, type: ColumnType } | { __typename: 'NumbersValue', id: string, type: ColumnType } | { __typename: 'PeopleValue', id: string, type: ColumnType } | { __typename: 'PersonValue', id: string, type: ColumnType } | { __typename: 'PhoneValue', id: string, type: ColumnType } | { __typename: 'ProgressValue', id: string, type: ColumnType } | { __typename: 'RatingValue', id: string, type: ColumnType } | { __typename: 'StatusValue', id: string, type: ColumnType } | { __typename: 'SubtasksValue', id: string, type: ColumnType } | { __typename: 'TagsValue', id: string, type: ColumnType } | { __typename: 'TeamValue', id: string, type: ColumnType } | { __typename: 'TextValue', value?: any | null, id: string, type: ColumnType } | { __typename: 'TimeTrackingValue', id: string, type: ColumnType } | { __typename: 'TimelineValue', from?: any | null, to?: any | null, id: string, type: ColumnType } | { __typename: 'UnsupportedValue', id: string, type: ColumnType } | { __typename: 'VoteValue', id: string, type: ColumnType } | { __typename: 'WeekValue', id: string, type: ColumnType } | { __typename: 'WorldClockValue', id: string, type: ColumnType }> }> } } | null> | null };

export type CreateFolderMutationVariables = Exact<{
  workspaceId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  color?: InputMaybe<FolderColor>;
  fontWeight?: InputMaybe<FolderFontWeight>;
  customIcon?: InputMaybe<FolderCustomIcon>;
  parentFolderId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CreateFolderMutation = { __typename?: 'Mutation', create_folder?: { __typename?: 'Folder', id: string } | null };

export type CreateGroupMutationVariables = Exact<{
  boardId: Scalars['ID']['input'];
  groupName: Scalars['String']['input'];
  groupColor?: InputMaybe<Scalars['String']['input']>;
  relativeTo?: InputMaybe<Scalars['String']['input']>;
  positionRelativeMethod?: InputMaybe<PositionRelative>;
}>;


export type CreateGroupMutation = { __typename?: 'Mutation', create_group?: { __typename?: 'Group', id: string, title: string } | null };

export type CreateSubitemMutationVariables = Exact<{
  parentItemId: Scalars['ID']['input'];
  itemName: Scalars['String']['input'];
  columnValues?: InputMaybe<Scalars['JSON']['input']>;
}>;


export type CreateSubitemMutation = { __typename?: 'Mutation', create_subitem?: { __typename?: 'Item', id: string, name: string, parent_item?: { __typename?: 'Item', id: string } | null } | null };

export type DuplicateItemMutationVariables = Exact<{
  boardId: Scalars['ID']['input'];
  itemId: Scalars['ID']['input'];
  withUpdates?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type DuplicateItemMutation = { __typename?: 'Mutation', duplicate_item?: { __typename?: 'Item', id: string, name: string } | null };

export type CreateWorkspaceMutationVariables = Exact<{
  name: Scalars['String']['input'];
  workspaceKind: WorkspaceKind;
  description?: InputMaybe<Scalars['String']['input']>;
  accountProductId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CreateWorkspaceMutation = { __typename?: 'Mutation', create_workspace?: { __typename?: 'Workspace', id?: string | null } | null };

export type CreateDashboardMutationVariables = Exact<{
  name: Scalars['String']['input'];
  workspace_id: Scalars['ID']['input'];
  board_ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  kind?: InputMaybe<DashboardKind>;
  board_folder_id?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CreateDashboardMutation = { __typename?: 'Mutation', create_dashboard?: { __typename?: 'Dashboard', id?: string | null, name?: string | null, workspace_id?: string | null, kind?: DashboardKind | null, board_folder_id?: string | null } | null };

export type GetAllWidgetsSchemaQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllWidgetsSchemaQuery = { __typename?: 'Query', all_widgets_schema?: Array<{ __typename?: 'WidgetSchemaInfo', widget_type?: ExternalWidget | null, schema?: any | null }> | null };

export type CreateWidgetMutationVariables = Exact<{
  parent: WidgetParentInput;
  kind: ExternalWidget;
  name: Scalars['String']['input'];
  settings: Scalars['JSON']['input'];
}>;


export type CreateWidgetMutation = { __typename?: 'Mutation', create_widget?: { __typename?: 'Widget', id?: string | null, name?: string | null, kind?: ExternalWidget | null, parent?: { __typename?: 'WidgetParentOutput', kind?: WidgetParentKind | null, id?: string | null } | null } | null };

export type GetBoardAllActivityQueryVariables = Exact<{
  boardId: Scalars['ID']['input'];
  fromDate: Scalars['ISO8601DateTime']['input'];
  toDate: Scalars['ISO8601DateTime']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetBoardAllActivityQuery = { __typename?: 'Query', boards?: Array<{ __typename?: 'Board', activity_logs?: Array<{ __typename?: 'ActivityLogType', user_id: string, entity: string, event: string, data: string, created_at: string } | null> | null } | null> | null };

export type GetBoardInfoQueryVariables = Exact<{
  boardId: Scalars['ID']['input'];
}>;


export type GetBoardInfoQuery = { __typename?: 'Query', boards?: Array<{ __typename?: 'Board', id: string, name: string, description?: string | null, state: State, board_kind: BoardKind, permissions: string, url: string, updated_at?: any | null, item_terminology?: string | null, items_count?: number | null, items_limit?: number | null, board_folder_id?: string | null, creator: { __typename?: 'User', id: string, name: string, email: string }, workspace?: { __typename?: 'Workspace', id?: string | null, name: string, kind?: WorkspaceKind | null, description?: string | null } | null, columns?: Array<{ __typename?: 'Column', id: string, title: string, description?: string | null, type: ColumnType, settings?: any | null } | null> | null, groups?: Array<{ __typename?: 'Group', id: string, title: string } | null> | null, owners: Array<{ __typename?: 'User', id: string, name: string } | null>, team_owners?: Array<{ __typename?: 'Team', id: string, name: string, picture_url?: string | null }> | null, tags?: Array<{ __typename?: 'Tag', id: string, name: string } | null> | null, top_group: { __typename?: 'Group', id: string } } | null> | null };

export type GetBoardInfoJustColumnsQueryVariables = Exact<{
  boardId: Scalars['ID']['input'];
}>;


export type GetBoardInfoJustColumnsQuery = { __typename?: 'Query', boards?: Array<{ __typename?: 'Board', columns?: Array<{ __typename?: 'Column', id: string, title: string, description?: string | null, type: ColumnType, settings?: any | null } | null> | null } | null> | null };

export type ItemDataFragmentFragment = { __typename?: 'Item', id: string, name: string, created_at?: any | null, updated_at?: any | null, column_values?: Array<{ __typename?: 'BatteryValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'BoardRelationValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'ButtonValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'CheckboxValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'ColorPickerValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'CountryValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'CreationLogValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'DateValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'DependencyValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'DirectDocValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'DocValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'DropdownValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'EmailValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'FileValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'FormulaValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'GroupValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'HourValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'IntegrationValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'ItemIdValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'LastUpdatedValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'LinkValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'LocationValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'LongTextValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'MirrorValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'NumbersValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'PeopleValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'PersonValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'PhoneValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'ProgressValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'RatingValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'StatusValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'SubtasksValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'TagsValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'TeamValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'TextValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'TimeTrackingValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'TimelineValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'UnsupportedValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'VoteValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'WeekValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'WorldClockValue', id: string, text?: string | null, value?: any | null }> };

export type GetBoardItemsPageQueryVariables = Exact<{
  boardId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
  includeColumns: Scalars['Boolean']['input'];
  columnIds?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  queryParams?: InputMaybe<ItemsQuery>;
  includeSubItems: Scalars['Boolean']['input'];
}>;


export type GetBoardItemsPageQuery = { __typename?: 'Query', boards?: Array<{ __typename?: 'Board', id: string, name: string, items_page: { __typename?: 'ItemsResponse', cursor?: string | null, items: Array<{ __typename?: 'Item', id: string, name: string, created_at?: any | null, updated_at?: any | null, subitems?: Array<{ __typename?: 'Item', id: string, name: string, created_at?: any | null, updated_at?: any | null, column_values?: Array<{ __typename?: 'BatteryValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'BoardRelationValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'ButtonValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'CheckboxValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'ColorPickerValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'CountryValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'CreationLogValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'DateValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'DependencyValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'DirectDocValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'DocValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'DropdownValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'EmailValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'FileValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'FormulaValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'GroupValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'HourValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'IntegrationValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'ItemIdValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'LastUpdatedValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'LinkValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'LocationValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'LongTextValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'MirrorValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'NumbersValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'PeopleValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'PersonValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'PhoneValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'ProgressValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'RatingValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'StatusValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'SubtasksValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'TagsValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'TeamValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'TextValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'TimeTrackingValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'TimelineValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'UnsupportedValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'VoteValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'WeekValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'WorldClockValue', id: string, text?: string | null, value?: any | null }> } | null> | null, column_values?: Array<{ __typename?: 'BatteryValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'BoardRelationValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'ButtonValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'CheckboxValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'ColorPickerValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'CountryValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'CreationLogValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'DateValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'DependencyValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'DirectDocValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'DocValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'DropdownValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'EmailValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'FileValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'FormulaValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'GroupValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'HourValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'IntegrationValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'ItemIdValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'LastUpdatedValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'LinkValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'LocationValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'LongTextValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'MirrorValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'NumbersValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'PeopleValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'PersonValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'PhoneValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'ProgressValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'RatingValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'StatusValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'SubtasksValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'TagsValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'TeamValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'TextValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'TimeTrackingValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'TimelineValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'UnsupportedValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'VoteValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'WeekValue', id: string, text?: string | null, value?: any | null } | { __typename?: 'WorldClockValue', id: string, text?: string | null, value?: any | null }> }> } } | null> | null };

export type SmartSearchBoardItemIdsQueryVariables = Exact<{
  searchTerm: Scalars['String']['input'];
  boardId: Scalars['ID']['input'];
}>;


export type SmartSearchBoardItemIdsQuery = { __typename?: 'Query', search_items?: { __typename?: 'SearchItemsGraphQlResultsView', results: Array<{ __typename?: 'QueryResult', data: { __typename?: 'Item', id: string } }> } | null };

export type GetColumnTypeSchemaQueryVariables = Exact<{
  type: ColumnType;
}>;


export type GetColumnTypeSchemaQuery = { __typename?: 'Query', get_column_type_schema?: any | null };

export type UserDetailsFragment = { __typename?: 'User', id: string, name: string, title?: string | null, email: string, enabled: boolean, is_admin?: boolean | null, is_guest?: boolean | null, is_pending?: boolean | null, is_verified?: boolean | null, is_view_only?: boolean | null, join_date?: any | null, last_activity?: any | null, location?: string | null, mobile_phone?: string | null, phone?: string | null, photo_thumb?: string | null, time_zone_identifier?: string | null, utc_hours_diff?: number | null };

export type UserTeamMembershipFragment = { __typename?: 'Team', id: string, name: string, is_guest?: boolean | null, picture_url?: string | null };

export type TeamBasicInfoFragment = { __typename?: 'Team', id: string, name: string };

export type TeamExtendedInfoFragment = { __typename?: 'Team', is_guest?: boolean | null, picture_url?: string | null, id: string, name: string };

export type TeamOwnerFragment = { __typename?: 'User', id: string, name: string, email: string };

export type TeamMemberFragment = { __typename?: 'User', id: string, name: string, email: string, title?: string | null, is_admin?: boolean | null, is_guest?: boolean | null, is_pending?: boolean | null, is_verified?: boolean | null, is_view_only?: boolean | null, join_date?: any | null, last_activity?: any | null, location?: string | null, mobile_phone?: string | null, phone?: string | null, photo_thumb?: string | null, time_zone_identifier?: string | null, utc_hours_diff?: number | null };

export type TeamMemberSimplifiedFragment = { __typename?: 'User', id: string, name: string, email: string, title?: string | null, is_admin?: boolean | null, is_guest?: boolean | null };

export type UserTeamMembershipSimplifiedFragment = { __typename?: 'Team', id: string, name: string, is_guest?: boolean | null };

export type ListUsersWithTeamsQueryVariables = Exact<{
  userIds?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListUsersWithTeamsQuery = { __typename?: 'Query', users?: Array<{ __typename?: 'User', id: string, name: string, title?: string | null, email: string, enabled: boolean, is_admin?: boolean | null, is_guest?: boolean | null, is_pending?: boolean | null, is_verified?: boolean | null, is_view_only?: boolean | null, join_date?: any | null, last_activity?: any | null, location?: string | null, mobile_phone?: string | null, phone?: string | null, photo_thumb?: string | null, time_zone_identifier?: string | null, utc_hours_diff?: number | null, teams?: Array<{ __typename?: 'Team', id: string, name: string, is_guest?: boolean | null, picture_url?: string | null } | null> | null } | null> | null };

export type ListUsersOnlyQueryVariables = Exact<{
  userIds?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListUsersOnlyQuery = { __typename?: 'Query', users?: Array<{ __typename?: 'User', id: string, name: string, title?: string | null, email: string, enabled: boolean, is_admin?: boolean | null, is_guest?: boolean | null, is_pending?: boolean | null, is_verified?: boolean | null, is_view_only?: boolean | null, join_date?: any | null, last_activity?: any | null, location?: string | null, mobile_phone?: string | null, phone?: string | null, photo_thumb?: string | null, time_zone_identifier?: string | null, utc_hours_diff?: number | null, teams?: Array<{ __typename?: 'Team', id: string, name: string, is_guest?: boolean | null, picture_url?: string | null } | null> | null } | null> | null };

export type ListUsersAndTeamsQueryVariables = Exact<{
  userIds?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  teamIds?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListUsersAndTeamsQuery = { __typename?: 'Query', users?: Array<{ __typename?: 'User', id: string, name: string, title?: string | null, email: string, enabled: boolean, is_admin?: boolean | null, is_guest?: boolean | null, is_pending?: boolean | null, is_verified?: boolean | null, is_view_only?: boolean | null, join_date?: any | null, last_activity?: any | null, location?: string | null, mobile_phone?: string | null, phone?: string | null, photo_thumb?: string | null, time_zone_identifier?: string | null, utc_hours_diff?: number | null, teams?: Array<{ __typename?: 'Team', id: string, name: string, is_guest?: boolean | null } | null> | null } | null> | null, teams?: Array<{ __typename?: 'Team', is_guest?: boolean | null, picture_url?: string | null, id: string, name: string, owners: Array<{ __typename?: 'User', id: string, name: string, email: string }>, users?: Array<{ __typename?: 'User', id: string, name: string, email: string, title?: string | null, is_admin?: boolean | null, is_guest?: boolean | null } | null> | null } | null> | null };

export type ListTeamsOnlyQueryVariables = Exact<{
  teamIds?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type ListTeamsOnlyQuery = { __typename?: 'Query', teams?: Array<{ __typename?: 'Team', id: string, name: string } | null> | null };

export type ListTeamsWithMembersQueryVariables = Exact<{
  teamIds?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type ListTeamsWithMembersQuery = { __typename?: 'Query', teams?: Array<{ __typename?: 'Team', is_guest?: boolean | null, picture_url?: string | null, id: string, name: string, owners: Array<{ __typename?: 'User', id: string, name: string, email: string }>, users?: Array<{ __typename?: 'User', id: string, name: string, email: string, title?: string | null, is_admin?: boolean | null, is_guest?: boolean | null, is_pending?: boolean | null, is_verified?: boolean | null, is_view_only?: boolean | null, join_date?: any | null, last_activity?: any | null, location?: string | null, mobile_phone?: string | null, phone?: string | null, photo_thumb?: string | null, time_zone_identifier?: string | null, utc_hours_diff?: number | null } | null> | null } | null> | null };

export type GetUserByNameQueryVariables = Exact<{
  name?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetUserByNameQuery = { __typename?: 'Query', users?: Array<{ __typename?: 'User', id: string, name: string, title?: string | null, email: string, enabled: boolean, is_admin?: boolean | null, is_guest?: boolean | null, is_pending?: boolean | null, is_verified?: boolean | null, is_view_only?: boolean | null, join_date?: any | null, last_activity?: any | null, location?: string | null, mobile_phone?: string | null, phone?: string | null, photo_thumb?: string | null, time_zone_identifier?: string | null, utc_hours_diff?: number | null, teams?: Array<{ __typename?: 'Team', id: string, name: string, is_guest?: boolean | null, picture_url?: string | null } | null> | null } | null> | null };

export type GetCurrentUserQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCurrentUserQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, name: string, title?: string | null, enabled: boolean, is_admin?: boolean | null, is_guest?: boolean | null } | null };

export type ListWorkspacesQueryVariables = Exact<{
  limit: Scalars['Int']['input'];
}>;


export type ListWorkspacesQuery = { __typename?: 'Query', workspaces?: Array<{ __typename?: 'Workspace', id?: string | null, name: string, description?: string | null } | null> | null };

export type UpdateBoardHierarchyMutationVariables = Exact<{
  boardId: Scalars['ID']['input'];
  attributes: UpdateBoardHierarchyAttributesInput;
}>;


export type UpdateBoardHierarchyMutation = { __typename?: 'Mutation', update_board_hierarchy?: { __typename?: 'UpdateBoardHierarchyResult', success: boolean, message?: string | null, board?: { __typename?: 'Board', id: string } | null } | null };

export type UpdateOverviewHierarchyMutationVariables = Exact<{
  overviewId: Scalars['ID']['input'];
  attributes: UpdateOverviewHierarchyAttributesInput;
}>;


export type UpdateOverviewHierarchyMutation = { __typename?: 'Mutation', update_overview_hierarchy?: { __typename?: 'UpdateOverviewHierarchy', success: boolean, message: string, overview?: { __typename?: 'Overview', id: string } | null } | null };

export type UpdateFolderMutationVariables = Exact<{
  folderId: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  color?: InputMaybe<FolderColor>;
  fontWeight?: InputMaybe<FolderFontWeight>;
  customIcon?: InputMaybe<FolderCustomIcon>;
  parentFolderId?: InputMaybe<Scalars['ID']['input']>;
  workspaceId?: InputMaybe<Scalars['ID']['input']>;
  accountProductId?: InputMaybe<Scalars['ID']['input']>;
  position?: InputMaybe<DynamicPosition>;
}>;


export type UpdateFolderMutation = { __typename?: 'Mutation', update_folder?: { __typename?: 'Folder', id: string } | null };

export type UpdateWorkspaceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  attributes: UpdateWorkspaceAttributesInput;
}>;


export type UpdateWorkspaceMutation = { __typename?: 'Mutation', update_workspace?: { __typename?: 'Workspace', id?: string | null } | null };

export type QuestionBasicFragment = { __typename?: 'FormQuestion', id: string, type?: FormQuestionType | null, title: string, description?: string | null, visible: boolean, required: boolean };

export type QuestionOptionsFragment = { __typename?: 'FormQuestion', options?: Array<{ __typename?: 'FormQuestionOption', label: string }> | null };

export type QuestionSettingsFragment = { __typename?: 'FormQuestion', settings?: { __typename?: 'FormQuestionSettings', prefixAutofilled?: boolean | null, checkedByDefault?: boolean | null, defaultCurrentDate?: boolean | null, includeTime?: boolean | null, display?: FormQuestionSelectDisplay | null, optionsOrder?: FormQuestionSelectOrderByOptions | null, locationAutofilled?: boolean | null, limit?: number | null, skipValidation?: boolean | null, prefill?: { __typename?: 'PrefillSettings', enabled: boolean, source?: FormQuestionPrefillSources | null, lookup: string } | null, prefixPredefined?: { __typename?: 'PhonePrefixPredefined', enabled: boolean, prefix?: string | null } | null } | null };

export type QuestionCompleteFragment = { __typename?: 'FormQuestion', showIfRules?: any | null, id: string, type?: FormQuestionType | null, title: string, description?: string | null, visible: boolean, required: boolean, options?: Array<{ __typename?: 'FormQuestionOption', label: string }> | null, settings?: { __typename?: 'FormQuestionSettings', prefixAutofilled?: boolean | null, checkedByDefault?: boolean | null, defaultCurrentDate?: boolean | null, includeTime?: boolean | null, display?: FormQuestionSelectDisplay | null, optionsOrder?: FormQuestionSelectOrderByOptions | null, locationAutofilled?: boolean | null, limit?: number | null, skipValidation?: boolean | null, prefill?: { __typename?: 'PrefillSettings', enabled: boolean, source?: FormQuestionPrefillSources | null, lookup: string } | null, prefixPredefined?: { __typename?: 'PhonePrefixPredefined', enabled: boolean, prefix?: string | null } | null } | null };

export type FormFeaturesFragment = { __typename?: 'FormFeatures', isInternal: boolean, reCaptchaChallenge: boolean, shortenedLink?: { __typename?: 'FormShortenedLink', enabled: boolean, url?: string | null } | null, password?: { __typename?: 'FormPassword', enabled: boolean } | null, draftSubmission?: { __typename?: 'FormDraftSubmission', enabled: boolean } | null, requireLogin?: { __typename?: 'FormRequireLogin', enabled: boolean, redirectToLogin: boolean } | null, responseLimit?: { __typename?: 'FormResponseLimit', enabled: boolean, limit?: number | null } | null, closeDate?: { __typename?: 'FormCloseDate', enabled: boolean, date?: string | null } | null, preSubmissionView?: { __typename?: 'FormPreSubmissionView', enabled: boolean, title?: string | null, description?: string | null, startButton?: { __typename?: 'FormStartButton', text?: string | null } | null } | null, afterSubmissionView?: { __typename?: 'FormAfterSubmissionView', title?: string | null, description?: string | null, allowResubmit: boolean, showSuccessImage: boolean, allowEditSubmission: boolean, allowViewSubmission: boolean, redirectAfterSubmission?: { __typename?: 'FormRedirectAfterSubmission', enabled: boolean, redirectUrl?: string | null } | null } | null, monday?: { __typename?: 'FormMonday', itemGroupId?: string | null, includeNameQuestion: boolean, includeUpdateQuestion: boolean, syncQuestionAndColumnsTitles: boolean } | null };

export type FormAppearanceFragment = { __typename?: 'FormAppearance', hideBranding: boolean, showProgressBar: boolean, primaryColor?: string | null, layout?: { __typename?: 'FormLayout', format?: FormFormat | null, alignment?: FormAlignment | null, direction?: FormDirection | null } | null, background?: { __typename?: 'FormBackground', type?: FormBackgrounds | null, value?: string | null } | null, text?: { __typename?: 'FormText', font?: string | null, color?: string | null, size?: FormFontSize | null } | null, logo?: { __typename?: 'FormLogo', position?: FormLogoPosition | null, url?: string | null, size?: FormLogoSize | null } | null, submitButton?: { __typename?: 'FormSubmitButton', text?: string | null } | null };

export type FormAccessibilityFragment = { __typename?: 'FormAccessibility', language?: string | null, logoAltText?: string | null };

export type FormTagFragment = { __typename?: 'FormTag', id: string, name: string, value?: string | null, columnId: string };

export type CreateFormMutationVariables = Exact<{
  destination_workspace_id: Scalars['ID']['input'];
  destination_folder_id?: InputMaybe<Scalars['ID']['input']>;
  destination_folder_name?: InputMaybe<Scalars['String']['input']>;
  board_kind?: InputMaybe<BoardKind>;
  destination_name?: InputMaybe<Scalars['String']['input']>;
  board_owner_ids?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  board_owner_team_ids?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  board_subscriber_ids?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  board_subscriber_teams_ids?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type CreateFormMutation = { __typename?: 'Mutation', create_form?: { __typename?: 'DehydratedFormResponse', boardId: string, token: string } | null };

export type GetFormQueryVariables = Exact<{
  formToken: Scalars['String']['input'];
}>;


export type GetFormQuery = { __typename?: 'Query', form?: { __typename?: 'ResponseForm', id: number, token: string, title: string, description?: string | null, active: boolean, ownerId?: number | null, type?: string | null, builtWithAI: boolean, isAnonymous: boolean, questions?: Array<{ __typename?: 'FormQuestion', showIfRules?: any | null, id: string, type?: FormQuestionType | null, title: string, description?: string | null, visible: boolean, required: boolean, options?: Array<{ __typename?: 'FormQuestionOption', label: string }> | null, settings?: { __typename?: 'FormQuestionSettings', prefixAutofilled?: boolean | null, checkedByDefault?: boolean | null, defaultCurrentDate?: boolean | null, includeTime?: boolean | null, display?: FormQuestionSelectDisplay | null, optionsOrder?: FormQuestionSelectOrderByOptions | null, locationAutofilled?: boolean | null, limit?: number | null, skipValidation?: boolean | null, prefill?: { __typename?: 'PrefillSettings', enabled: boolean, source?: FormQuestionPrefillSources | null, lookup: string } | null, prefixPredefined?: { __typename?: 'PhonePrefixPredefined', enabled: boolean, prefix?: string | null } | null } | null }> | null, features?: { __typename?: 'FormFeatures', isInternal: boolean, reCaptchaChallenge: boolean, shortenedLink?: { __typename?: 'FormShortenedLink', enabled: boolean, url?: string | null } | null, password?: { __typename?: 'FormPassword', enabled: boolean } | null, draftSubmission?: { __typename?: 'FormDraftSubmission', enabled: boolean } | null, requireLogin?: { __typename?: 'FormRequireLogin', enabled: boolean, redirectToLogin: boolean } | null, responseLimit?: { __typename?: 'FormResponseLimit', enabled: boolean, limit?: number | null } | null, closeDate?: { __typename?: 'FormCloseDate', enabled: boolean, date?: string | null } | null, preSubmissionView?: { __typename?: 'FormPreSubmissionView', enabled: boolean, title?: string | null, description?: string | null, startButton?: { __typename?: 'FormStartButton', text?: string | null } | null } | null, afterSubmissionView?: { __typename?: 'FormAfterSubmissionView', title?: string | null, description?: string | null, allowResubmit: boolean, showSuccessImage: boolean, allowEditSubmission: boolean, allowViewSubmission: boolean, redirectAfterSubmission?: { __typename?: 'FormRedirectAfterSubmission', enabled: boolean, redirectUrl?: string | null } | null } | null, monday?: { __typename?: 'FormMonday', itemGroupId?: string | null, includeNameQuestion: boolean, includeUpdateQuestion: boolean, syncQuestionAndColumnsTitles: boolean } | null } | null, appearance?: { __typename?: 'FormAppearance', hideBranding: boolean, showProgressBar: boolean, primaryColor?: string | null, layout?: { __typename?: 'FormLayout', format?: FormFormat | null, alignment?: FormAlignment | null, direction?: FormDirection | null } | null, background?: { __typename?: 'FormBackground', type?: FormBackgrounds | null, value?: string | null } | null, text?: { __typename?: 'FormText', font?: string | null, color?: string | null, size?: FormFontSize | null } | null, logo?: { __typename?: 'FormLogo', position?: FormLogoPosition | null, url?: string | null, size?: FormLogoSize | null } | null, submitButton?: { __typename?: 'FormSubmitButton', text?: string | null } | null } | null, accessibility?: { __typename?: 'FormAccessibility', language?: string | null, logoAltText?: string | null } | null, tags?: Array<{ __typename?: 'FormTag', id: string, name: string, value?: string | null, columnId: string }> | null } | null };

export type DeleteFormQuestionMutationVariables = Exact<{
  formToken: Scalars['String']['input'];
  questionId: Scalars['String']['input'];
}>;


export type DeleteFormQuestionMutation = { __typename?: 'Mutation', delete_question?: boolean | null };

export type CreateFormQuestionMutationVariables = Exact<{
  formToken: Scalars['String']['input'];
  question: CreateQuestionInput;
}>;


export type CreateFormQuestionMutation = { __typename?: 'Mutation', create_form_question?: { __typename?: 'FormQuestion', id: string, type?: FormQuestionType | null, title: string, description?: string | null, visible: boolean, required: boolean, options?: Array<{ __typename?: 'FormQuestionOption', label: string }> | null, settings?: { __typename?: 'FormQuestionSettings', prefixAutofilled?: boolean | null, checkedByDefault?: boolean | null, defaultCurrentDate?: boolean | null, includeTime?: boolean | null, display?: FormQuestionSelectDisplay | null, optionsOrder?: FormQuestionSelectOrderByOptions | null, locationAutofilled?: boolean | null, limit?: number | null, skipValidation?: boolean | null, prefill?: { __typename?: 'PrefillSettings', enabled: boolean, source?: FormQuestionPrefillSources | null, lookup: string } | null, prefixPredefined?: { __typename?: 'PhonePrefixPredefined', enabled: boolean, prefix?: string | null } | null } | null } | null };

export type UpdateFormQuestionMutationVariables = Exact<{
  formToken: Scalars['String']['input'];
  questionId: Scalars['String']['input'];
  question: UpdateQuestionInput;
}>;


export type UpdateFormQuestionMutation = { __typename?: 'Mutation', update_form_question?: { __typename?: 'FormQuestion', id: string, type?: FormQuestionType | null, title: string, description?: string | null, visible: boolean, required: boolean, options?: Array<{ __typename?: 'FormQuestionOption', label: string }> | null, settings?: { __typename?: 'FormQuestionSettings', prefixAutofilled?: boolean | null, checkedByDefault?: boolean | null, defaultCurrentDate?: boolean | null, includeTime?: boolean | null, display?: FormQuestionSelectDisplay | null, optionsOrder?: FormQuestionSelectOrderByOptions | null, locationAutofilled?: boolean | null, limit?: number | null, skipValidation?: boolean | null, prefill?: { __typename?: 'PrefillSettings', enabled: boolean, source?: FormQuestionPrefillSources | null, lookup: string } | null, prefixPredefined?: { __typename?: 'PhonePrefixPredefined', enabled: boolean, prefix?: string | null } | null } | null } | null };

export type UpdateFormMutationVariables = Exact<{
  formToken: Scalars['String']['input'];
  input: UpdateFormInput;
}>;


export type UpdateFormMutation = { __typename?: 'Mutation', update_form?: { __typename?: 'ResponseForm', title: string, description?: string | null, questions?: Array<{ __typename?: 'FormQuestion', id: string }> | null } | null };

export type UpdateFormSettingsMutationVariables = Exact<{
  formToken: Scalars['String']['input'];
  settings: UpdateFormSettingsInput;
}>;


export type UpdateFormSettingsMutation = { __typename?: 'Mutation', update_form_settings?: { __typename?: 'ResponseForm', features?: { __typename?: 'FormFeatures', isInternal: boolean, reCaptchaChallenge: boolean, shortenedLink?: { __typename?: 'FormShortenedLink', enabled: boolean, url?: string | null } | null, password?: { __typename?: 'FormPassword', enabled: boolean } | null, draftSubmission?: { __typename?: 'FormDraftSubmission', enabled: boolean } | null, requireLogin?: { __typename?: 'FormRequireLogin', enabled: boolean, redirectToLogin: boolean } | null, responseLimit?: { __typename?: 'FormResponseLimit', enabled: boolean, limit?: number | null } | null, closeDate?: { __typename?: 'FormCloseDate', enabled: boolean, date?: string | null } | null, preSubmissionView?: { __typename?: 'FormPreSubmissionView', enabled: boolean, title?: string | null, description?: string | null, startButton?: { __typename?: 'FormStartButton', text?: string | null } | null } | null, afterSubmissionView?: { __typename?: 'FormAfterSubmissionView', title?: string | null, description?: string | null, allowResubmit: boolean, showSuccessImage: boolean, allowEditSubmission: boolean, allowViewSubmission: boolean, redirectAfterSubmission?: { __typename?: 'FormRedirectAfterSubmission', enabled: boolean, redirectUrl?: string | null } | null } | null, monday?: { __typename?: 'FormMonday', itemGroupId?: string | null, includeNameQuestion: boolean, includeUpdateQuestion: boolean, syncQuestionAndColumnsTitles: boolean } | null } | null, appearance?: { __typename?: 'FormAppearance', hideBranding: boolean, showProgressBar: boolean, primaryColor?: string | null, layout?: { __typename?: 'FormLayout', format?: FormFormat | null, alignment?: FormAlignment | null, direction?: FormDirection | null } | null, background?: { __typename?: 'FormBackground', type?: FormBackgrounds | null, value?: string | null } | null, text?: { __typename?: 'FormText', font?: string | null, color?: string | null, size?: FormFontSize | null } | null, logo?: { __typename?: 'FormLogo', position?: FormLogoPosition | null, url?: string | null, size?: FormLogoSize | null } | null, submitButton?: { __typename?: 'FormSubmitButton', text?: string | null } | null } | null, accessibility?: { __typename?: 'FormAccessibility', language?: string | null, logoAltText?: string | null } | null } | null };

export type SetFormPasswordMutationVariables = Exact<{
  formToken: Scalars['String']['input'];
  input: SetFormPasswordInput;
}>;


export type SetFormPasswordMutation = { __typename?: 'Mutation', set_form_password?: { __typename?: 'ResponseForm', id: number } | null };

export type ShortenFormUrlMutationVariables = Exact<{
  formToken: Scalars['String']['input'];
}>;


export type ShortenFormUrlMutation = { __typename?: 'Mutation', shorten_form_url?: { __typename?: 'FormShortenedLink', enabled: boolean, url?: string | null } | null };

export type DeactivateFormMutationVariables = Exact<{
  formToken: Scalars['String']['input'];
}>;


export type DeactivateFormMutation = { __typename?: 'Mutation', deactivate_form?: boolean | null };

export type ActivateFormMutationVariables = Exact<{
  formToken: Scalars['String']['input'];
}>;


export type ActivateFormMutation = { __typename?: 'Mutation', activate_form?: boolean | null };

export type DeleteFormTagMutationVariables = Exact<{
  formToken: Scalars['String']['input'];
  tagId: Scalars['String']['input'];
}>;


export type DeleteFormTagMutation = { __typename?: 'Mutation', delete_form_tag?: boolean | null };

export type CreateFormTagMutationVariables = Exact<{
  formToken: Scalars['String']['input'];
  tag: CreateFormTagInput;
}>;


export type CreateFormTagMutation = { __typename?: 'Mutation', create_form_tag?: { __typename?: 'FormTag', id: string, name: string, value?: string | null, columnId: string } | null };

export type UpdateFormTagMutationVariables = Exact<{
  formToken: Scalars['String']['input'];
  tagId: Scalars['String']['input'];
  tag: UpdateFormTagInput;
}>;


export type UpdateFormTagMutation = { __typename?: 'Mutation', update_form_tag?: boolean | null };

export type UpdateFormAppearanceMutationVariables = Exact<{
  formToken: Scalars['String']['input'];
  appearance: FormAppearanceInput;
}>;


export type UpdateFormAppearanceMutation = { __typename?: 'Mutation', update_form_settings?: { __typename?: 'ResponseForm', appearance?: { __typename?: 'FormAppearance', hideBranding: boolean, showProgressBar: boolean, primaryColor?: string | null, layout?: { __typename?: 'FormLayout', format?: FormFormat | null, alignment?: FormAlignment | null, direction?: FormDirection | null } | null, background?: { __typename?: 'FormBackground', type?: FormBackgrounds | null, value?: string | null } | null, text?: { __typename?: 'FormText', font?: string | null, color?: string | null, size?: FormFontSize | null } | null, logo?: { __typename?: 'FormLogo', position?: FormLogoPosition | null, url?: string | null, size?: FormLogoSize | null } | null, submitButton?: { __typename?: 'FormSubmitButton', text?: string | null } | null } | null } | null };

export type UpdateFormAccessibilityMutationVariables = Exact<{
  formToken: Scalars['String']['input'];
  accessibility: FormAccessibilityInput;
}>;


export type UpdateFormAccessibilityMutation = { __typename?: 'Mutation', update_form_settings?: { __typename?: 'ResponseForm', accessibility?: { __typename?: 'FormAccessibility', language?: string | null, logoAltText?: string | null } | null } | null };

export type UpdateFormFeaturesMutationVariables = Exact<{
  formToken: Scalars['String']['input'];
  features: FormFeaturesInput;
}>;


export type UpdateFormFeaturesMutation = { __typename?: 'Mutation', update_form_settings?: { __typename?: 'ResponseForm', features?: { __typename?: 'FormFeatures', isInternal: boolean, reCaptchaChallenge: boolean, shortenedLink?: { __typename?: 'FormShortenedLink', enabled: boolean, url?: string | null } | null, password?: { __typename?: 'FormPassword', enabled: boolean } | null, draftSubmission?: { __typename?: 'FormDraftSubmission', enabled: boolean } | null, requireLogin?: { __typename?: 'FormRequireLogin', enabled: boolean, redirectToLogin: boolean } | null, responseLimit?: { __typename?: 'FormResponseLimit', enabled: boolean, limit?: number | null } | null, closeDate?: { __typename?: 'FormCloseDate', enabled: boolean, date?: string | null } | null, preSubmissionView?: { __typename?: 'FormPreSubmissionView', enabled: boolean, title?: string | null, description?: string | null, startButton?: { __typename?: 'FormStartButton', text?: string | null } | null } | null, afterSubmissionView?: { __typename?: 'FormAfterSubmissionView', title?: string | null, description?: string | null, allowResubmit: boolean, showSuccessImage: boolean, allowEditSubmission: boolean, allowViewSubmission: boolean, redirectAfterSubmission?: { __typename?: 'FormRedirectAfterSubmission', enabled: boolean, redirectUrl?: string | null } | null } | null, monday?: { __typename?: 'FormMonday', itemGroupId?: string | null, includeNameQuestion: boolean, includeUpdateQuestion: boolean, syncQuestionAndColumnsTitles: boolean } | null } | null } | null };

export type UpdateFormQuestionOrderMutationVariables = Exact<{
  formToken: Scalars['String']['input'];
  questions: Array<QuestionOrderInput> | QuestionOrderInput;
}>;


export type UpdateFormQuestionOrderMutation = { __typename?: 'Mutation', update_form?: { __typename?: 'ResponseForm', questions?: Array<{ __typename?: 'FormQuestion', id: string }> | null } | null };

export type UpdateFormHeaderMutationVariables = Exact<{
  formToken: Scalars['String']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
}>;


export type UpdateFormHeaderMutation = { __typename?: 'Mutation', update_form?: { __typename?: 'ResponseForm', title: string, description?: string | null } | null };

export type DeleteItemMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteItemMutation = { __typename?: 'Mutation', delete_item?: { __typename?: 'Item', id: string } | null };

export type CreateItemMutationVariables = Exact<{
  boardId: Scalars['ID']['input'];
  itemName: Scalars['String']['input'];
  groupId?: InputMaybe<Scalars['String']['input']>;
  columnValues?: InputMaybe<Scalars['JSON']['input']>;
}>;


export type CreateItemMutation = { __typename?: 'Mutation', create_item?: { __typename?: 'Item', id: string, name: string } | null };

export type CreateUpdateMutationVariables = Exact<{
  itemId: Scalars['ID']['input'];
  body: Scalars['String']['input'];
  mentionsList?: InputMaybe<Array<InputMaybe<UpdateMention>> | InputMaybe<UpdateMention>>;
}>;


export type CreateUpdateMutation = { __typename?: 'Mutation', create_update?: { __typename?: 'Update', id: string } | null };

export type GetBoardSchemaQueryVariables = Exact<{
  boardId: Scalars['ID']['input'];
}>;


export type GetBoardSchemaQuery = { __typename?: 'Query', boards?: Array<{ __typename?: 'Board', groups?: Array<{ __typename?: 'Group', id: string, title: string } | null> | null, columns?: Array<{ __typename?: 'Column', id: string, type: ColumnType, title: string } | null> | null } | null> | null };

export type ChangeItemColumnValuesMutationVariables = Exact<{
  boardId: Scalars['ID']['input'];
  itemId: Scalars['ID']['input'];
  columnValues: Scalars['JSON']['input'];
}>;


export type ChangeItemColumnValuesMutation = { __typename?: 'Mutation', change_multiple_column_values?: { __typename?: 'Item', id: string } | null };

export type MoveItemToGroupMutationVariables = Exact<{
  itemId: Scalars['ID']['input'];
  groupId: Scalars['String']['input'];
}>;


export type MoveItemToGroupMutation = { __typename?: 'Mutation', move_item_to_group?: { __typename?: 'Item', id: string } | null };

export type CreateBoardMutationVariables = Exact<{
  boardKind: BoardKind;
  boardName: Scalars['String']['input'];
  boardDescription?: InputMaybe<Scalars['String']['input']>;
  workspaceId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CreateBoardMutation = { __typename?: 'Mutation', create_board?: { __typename?: 'Board', id: string } | null };

export type CreateColumnMutationVariables = Exact<{
  boardId: Scalars['ID']['input'];
  columnType: ColumnType;
  columnTitle: Scalars['String']['input'];
  columnDescription?: InputMaybe<Scalars['String']['input']>;
  columnSettings?: InputMaybe<Scalars['JSON']['input']>;
}>;


export type CreateColumnMutation = { __typename?: 'Mutation', create_column?: { __typename?: 'Column', id: string } | null };

export type DeleteColumnMutationVariables = Exact<{
  boardId: Scalars['ID']['input'];
  columnId: Scalars['String']['input'];
}>;


export type DeleteColumnMutation = { __typename?: 'Mutation', delete_column?: { __typename?: 'Column', id: string } | null };

export type GetGraphQlSchemaQueryVariables = Exact<{ [key: string]: never; }>;


export type GetGraphQlSchemaQuery = { __typename?: 'Query', __schema: { __typename?: '__Schema', queryType: { __typename?: '__Type', name?: string | null }, mutationType?: { __typename?: '__Type', name?: string | null } | null, types: Array<{ __typename?: '__Type', name?: string | null, kind: __TypeKind }> }, queryType?: { __typename?: '__Type', name?: string | null, fields?: Array<{ __typename?: '__Field', name: string, description?: string | null, type: { __typename?: '__Type', name?: string | null, kind: __TypeKind, ofType?: { __typename?: '__Type', name?: string | null, kind: __TypeKind, ofType?: { __typename?: '__Type', name?: string | null, kind: __TypeKind } | null } | null } }> | null } | null, mutationType?: { __typename?: '__Type', name?: string | null, fields?: Array<{ __typename?: '__Field', name: string, description?: string | null, type: { __typename?: '__Type', name?: string | null, kind: __TypeKind, ofType?: { __typename?: '__Type', name?: string | null, kind: __TypeKind, ofType?: { __typename?: '__Type', name?: string | null, kind: __TypeKind } | null } | null } }> | null } | null };

export type IntrospectionQueryQueryVariables = Exact<{ [key: string]: never; }>;


export type IntrospectionQueryQuery = { __typename?: 'Query', __schema: { __typename?: '__Schema', queryType: { __typename?: '__Type', name?: string | null }, mutationType?: { __typename?: '__Type', name?: string | null } | null, subscriptionType?: { __typename?: '__Type', name?: string | null } | null, types: Array<{ __typename?: '__Type', kind: __TypeKind, name?: string | null, description?: string | null, fields?: Array<{ __typename?: '__Field', name: string, description?: string | null, isDeprecated: boolean, deprecationReason?: string | null, args: Array<{ __typename?: '__InputValue', name: string, description?: string | null, defaultValue?: string | null, isDeprecated: boolean, deprecationReason?: string | null, type: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null } | null } | null } | null } | null } | null } | null } | null } }>, type: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null } | null } | null } | null } | null } | null } | null } | null } }> | null, inputFields?: Array<{ __typename?: '__InputValue', name: string, description?: string | null, defaultValue?: string | null, isDeprecated: boolean, deprecationReason?: string | null, type: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null } | null } | null } | null } | null } | null } | null } | null } }> | null, interfaces?: Array<{ __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null } | null } | null } | null } | null } | null } | null } | null }> | null, enumValues?: Array<{ __typename?: '__EnumValue', name: string, description?: string | null, isDeprecated: boolean, deprecationReason?: string | null }> | null, possibleTypes?: Array<{ __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null } | null } | null } | null } | null } | null } | null } | null }> | null }>, directives: Array<{ __typename?: '__Directive', name: string, description?: string | null, locations: Array<__DirectiveLocation>, args: Array<{ __typename?: '__InputValue', name: string, description?: string | null, defaultValue?: string | null, isDeprecated: boolean, deprecationReason?: string | null, type: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null } | null } | null } | null } | null } | null } | null } | null } }> }> } };

export type FullTypeFragment = { __typename?: '__Type', kind: __TypeKind, name?: string | null, description?: string | null, fields?: Array<{ __typename?: '__Field', name: string, description?: string | null, isDeprecated: boolean, deprecationReason?: string | null, args: Array<{ __typename?: '__InputValue', name: string, description?: string | null, defaultValue?: string | null, isDeprecated: boolean, deprecationReason?: string | null, type: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null } | null } | null } | null } | null } | null } | null } | null } }>, type: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null } | null } | null } | null } | null } | null } | null } | null } }> | null, inputFields?: Array<{ __typename?: '__InputValue', name: string, description?: string | null, defaultValue?: string | null, isDeprecated: boolean, deprecationReason?: string | null, type: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null } | null } | null } | null } | null } | null } | null } | null } }> | null, interfaces?: Array<{ __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null } | null } | null } | null } | null } | null } | null } | null }> | null, enumValues?: Array<{ __typename?: '__EnumValue', name: string, description?: string | null, isDeprecated: boolean, deprecationReason?: string | null }> | null, possibleTypes?: Array<{ __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null } | null } | null } | null } | null } | null } | null } | null }> | null };

export type InputValueFragment = { __typename?: '__InputValue', name: string, description?: string | null, defaultValue?: string | null, isDeprecated: boolean, deprecationReason?: string | null, type: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null } | null } | null } | null } | null } | null } | null } | null } };

export type TypeRefFragment = { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null, ofType?: { __typename?: '__Type', kind: __TypeKind, name?: string | null } | null } | null } | null } | null } | null } | null } | null };

export type GetTypeDetailsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTypeDetailsQuery = { __typename?: 'Query', __type?: { __typename?: '__Type', name?: string | null, description?: string | null, kind: __TypeKind, fields?: Array<{ __typename?: '__Field', name: string, description?: string | null, type: { __typename?: '__Type', name?: string | null, kind: __TypeKind, ofType?: { __typename?: '__Type', name?: string | null, kind: __TypeKind, ofType?: { __typename?: '__Type', name?: string | null, kind: __TypeKind, ofType?: { __typename?: '__Type', name?: string | null, kind: __TypeKind, ofType?: { __typename?: '__Type', name?: string | null, kind: __TypeKind } | null } | null } | null } | null }, args: Array<{ __typename?: '__InputValue', name: string, description?: string | null, defaultValue?: string | null, type: { __typename?: '__Type', name?: string | null, kind: __TypeKind, ofType?: { __typename?: '__Type', name?: string | null, kind: __TypeKind, ofType?: { __typename?: '__Type', name?: string | null, kind: __TypeKind, ofType?: { __typename?: '__Type', name?: string | null, kind: __TypeKind } | null } | null } | null } }> }> | null, inputFields?: Array<{ __typename?: '__InputValue', name: string, description?: string | null, defaultValue?: string | null, type: { __typename?: '__Type', name?: string | null, kind: __TypeKind, ofType?: { __typename?: '__Type', name?: string | null, kind: __TypeKind, ofType?: { __typename?: '__Type', name?: string | null, kind: __TypeKind, ofType?: { __typename?: '__Type', name?: string | null, kind: __TypeKind, ofType?: { __typename?: '__Type', name?: string | null, kind: __TypeKind } | null } | null } | null } | null } }> | null, interfaces?: Array<{ __typename?: '__Type', name?: string | null }> | null, enumValues?: Array<{ __typename?: '__EnumValue', name: string, description?: string | null }> | null, possibleTypes?: Array<{ __typename?: '__Type', name?: string | null }> | null } | null };

export type CreateCustomActivityMutationVariables = Exact<{
  color: CustomActivityColor;
  icon_id: CustomActivityIcon;
  name: Scalars['String']['input'];
}>;


export type CreateCustomActivityMutation = { __typename?: 'Mutation', create_custom_activity?: { __typename?: 'CustomActivity', color?: CustomActivityColor | null, icon_id?: CustomActivityIcon | null, name?: string | null } | null };

export type CreateTimelineItemMutationVariables = Exact<{
  item_id: Scalars['ID']['input'];
  custom_activity_id: Scalars['String']['input'];
  title: Scalars['String']['input'];
  summary?: InputMaybe<Scalars['String']['input']>;
  content?: InputMaybe<Scalars['String']['input']>;
  timestamp: Scalars['ISO8601DateTime']['input'];
  time_range?: InputMaybe<TimelineItemTimeRange>;
  location?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
}>;


export type CreateTimelineItemMutation = { __typename?: 'Mutation', create_timeline_item?: { __typename?: 'TimelineItem', id?: string | null, title?: string | null, content?: string | null, created_at: any, custom_activity_id?: string | null, type?: string | null } | null };

export type FetchCustomActivityQueryVariables = Exact<{ [key: string]: never; }>;


export type FetchCustomActivityQuery = { __typename?: 'Query', custom_activity?: Array<{ __typename?: 'CustomActivity', color?: CustomActivityColor | null, icon_id?: CustomActivityIcon | null, id?: string | null, name?: string | null, type?: string | null }> | null };

export type GetItemBoardQueryVariables = Exact<{
  itemId: Scalars['ID']['input'];
}>;


export type GetItemBoardQuery = { __typename?: 'Query', items?: Array<{ __typename?: 'Item', id: string, board?: { __typename?: 'Board', id: string, columns?: Array<{ __typename?: 'Column', id: string, type: ColumnType } | null> | null } | null } | null> | null };

export type CreateDocMutationVariables = Exact<{
  location: CreateDocInput;
}>;


export type CreateDocMutation = { __typename?: 'Mutation', create_doc?: { __typename?: 'Document', id: string, url?: string | null, name: string } | null };

export type AddContentToDocFromMarkdownMutationVariables = Exact<{
  docId: Scalars['ID']['input'];
  markdown: Scalars['String']['input'];
  afterBlockId?: InputMaybe<Scalars['String']['input']>;
}>;


export type AddContentToDocFromMarkdownMutation = { __typename?: 'Mutation', add_content_to_doc_from_markdown?: { __typename?: 'DocBlocksFromMarkdownResult', success: boolean, block_ids?: Array<string> | null, error?: string | null } | null };

export type UpdateDocNameMutationVariables = Exact<{
  docId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
}>;


export type UpdateDocNameMutation = { __typename?: 'Mutation', update_doc_name?: any | null };

export type ReadDocsQueryVariables = Exact<{
  ids?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  object_ids?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<DocsOrderBy>;
  page?: InputMaybe<Scalars['Int']['input']>;
  workspace_ids?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>> | InputMaybe<Scalars['ID']['input']>>;
}>;


export type ReadDocsQuery = { __typename?: 'Query', docs?: Array<{ __typename?: 'Document', id: string, object_id: string, name: string, doc_kind: BoardKind, created_at?: any | null, settings?: any | null, url?: string | null, relative_url?: string | null, workspace_id?: string | null, doc_folder_id?: string | null, created_by?: { __typename?: 'User', id: string, name: string } | null, workspace?: { __typename?: 'Workspace', id?: string | null, name: string } | null } | null> | null };

export type ExportMarkdownFromDocQueryVariables = Exact<{
  docId: Scalars['ID']['input'];
  blockIds?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
}>;


export type ExportMarkdownFromDocQuery = { __typename?: 'Query', export_markdown_from_doc?: { __typename?: 'ExportMarkdownResult', success: boolean, markdown?: string | null, error?: string | null } | null };

export type GetWorkspaceInfoQueryVariables = Exact<{
  workspace_id: Scalars['ID']['input'];
}>;


export type GetWorkspaceInfoQuery = { __typename?: 'Query', workspaces?: Array<{ __typename?: 'Workspace', id?: string | null, name: string, description?: string | null, kind?: WorkspaceKind | null, created_at?: any | null, state?: State | null, is_default_workspace?: boolean | null, owners_subscribers?: Array<{ __typename?: 'User', id: string, name: string, email: string } | null> | null } | null> | null, boards?: Array<{ __typename?: 'Board', id: string, name: string, board_folder_id?: string | null } | null> | null, docs?: Array<{ __typename?: 'Document', id: string, name: string, doc_folder_id?: string | null } | null> | null, folders?: Array<{ __typename?: 'Folder', id: string, name: string } | null> | null };
