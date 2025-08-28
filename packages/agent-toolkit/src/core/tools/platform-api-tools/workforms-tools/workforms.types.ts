enum FormType {
  Internal = 'internal',
  InlineInternal = 'inline_internal',
  Preview = 'preview',
  Standard = 'standard',
  EnforcedItemCreationForm = 'enforced_item_creation_form',
}

enum LogoSize {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
  ExtraLarge = 'extraLarge',
}

enum LogoPosition {
  Auto = 'auto',
  Left = 'left',
  Center = 'center',
  Right = 'right',
}

interface Tag {
  id: string;
  name: string;
  columnId: string;
  value?: string;
}

enum BackgroundType {
  Image = 'image',
  Color = 'color',
  None = 'none',
}

enum Direction {
  LtR = 'ltr',
  Rtl = 'rtl',
}

enum Format {
  OneByOne = 'one-by-one',
  Classic = 'classic',
}

enum Alignment {
  FullLeft = 'full-left',
  Left = 'left',
  Center = 'center',
  Right = 'right',
  FullRight = 'full-right',
}

enum FontSize {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
}

enum WorkformsQuestionType {
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
  Updates = 'Updates',
}

enum PrefillSources {
  Account = 'account',
  QueryParam = 'queryParam',
}

enum PrefillAccountLookups {
  Email = 'email',
  Name = 'name',
  Title = 'title',
  Phone = 'phone',
  FirstName = 'first_name',
  LastName = 'last_name',
  Location = 'location',
  Timezone = 'time_zone',
  ManagerName = 'manager_display_name',
}

enum ConditionOperator {
  And = 'AND',
  Or = 'OR',
}

type Condition = {
  id: string;
  buildingBlockId: string; // id of the parent question
  operator: ConditionOperator;
  values: string[];
};

type PhoneQuestionSettings = {
  prefixAutofilled: boolean;
  prefixPredefined: {
    enabled: boolean;
    prefix: string | null;
  };
};

type BooleanQuestionSettings = {
  checkedByDefault: boolean;
};

type ConnectedBoardsQuestionSettings = {
  boards: {
    id: number;
    name: string;
  }[];
  allowMultipleItems: boolean;
};

type DateQuestionSettings = {
  defaultCurrentDate: boolean;
  includeTime: boolean;
};

enum SelectDisplay {
  Horizontal = 'horizontal',
  Vertical = 'vertical',
  Dropdown = 'dropdown',
}

enum SelectOrderByOptions {
  Alphabetical = 'alphabetical',
  Random = 'random',
  Custom = 'custom',
}

type SingleSelectQuestionSettings = {
  display: SelectDisplay;
  optionsOrder: SelectOrderByOptions;
  optionsPositions?: Record<string, number>;
};

type MultiSelectQuestionSettings = {
  display: SelectDisplay;
  labelLimitCount: number | null;
  optionsOrder: SelectOrderByOptions;
  optionsPositions?: Record<string, number>;
};

type LocationQuestionSettings = {
  locationAutofilled: boolean;
};

type RatingQuestionSettings = {
  limit: 3 | 4 | 5;
};

type PeopleQuestionSettings = {
  people: {
    id: number;
    name: string;
    photoUrl: string | null;
    title: string | null;
  }[];
  maximum: number | null;
};

type LinkQuestionSettings = {
  skipValidation: boolean;
};

type SubitemsQuestionSettings = {
  subitemBoardId: string;
  // eslint-disable-next-line no-use-before-define
  subQuestions: Question[];
};

type PrefillSettingsValue = {
  enabled: boolean;
  source: PrefillSources;
  lookup: PrefillAccountLookups | string;
};

type PrefillSettings = {
  prefill?: PrefillSettingsValue;
};

type ShowIfRule = {
  id: string;
  operator: ConditionOperator.Or;
  conditions: string[];
};

enum SelectOptionsType {
  MultiSelect = 'multi-select',
  SingleSelect = 'single-select',
  People = 'people',
  Location = 'location',
  CountryCode = 'country-code',
  Country = 'country',
  ConnectedBoards = 'connected_boards',
}

interface SelectOption {
  label: string;
  value: string;
}

interface PeopleOption extends SelectOption {
  avatarUrl?: string;
}

interface MultiSelectOption extends SelectOption {
  position: number;
  visible?: boolean;
  active?: boolean;
}

interface SingleSelectOption extends SelectOption {
  position: number;
  visible?: boolean;
  active?: boolean;
}

interface LocationOption extends SelectOption {
  address?: string;
  locationDetails?: {
    address: string;
    placeId: string;
  };
}

// Base settings that no-specific question uses, so we can add more settings to it
type BaseQuestionSettings = PrefillSettings;

type QuestionSettings =
  | BaseQuestionSettings
  | PhoneQuestionSettings
  | BooleanQuestionSettings
  | DateQuestionSettings
  | SingleSelectQuestionSettings
  | MultiSelectQuestionSettings
  | LocationQuestionSettings
  | RatingQuestionSettings
  | PeopleQuestionSettings
  | LinkQuestionSettings
  | ConnectedBoardsQuestionSettings
  | SubitemsQuestionSettings;

interface BaseQuestion {
  id: string;
  type: WorkformsQuestionType;
  visible: boolean;
  title: string;
  description: string | null;
  settings: QuestionSettings;
  required: boolean;
  showIfRules: {
    operator: ConditionOperator.Or;
    rules: ShowIfRule[];
  };
  forceRequired?: boolean;
}

export type PhoneQuestion = BaseQuestion & {
  type: WorkformsQuestionType.Phone;
  settings: PhoneQuestionSettings;
};

export type BooleanQuestion = BaseQuestion & {
  type: WorkformsQuestionType.Boolean;
  settings: BooleanQuestionSettings;
};

export type ConnectedBoardsQuestion = BaseQuestion & {
  type: WorkformsQuestionType.ConnectedBoards;
  settings: ConnectedBoardsQuestionSettings;
};

export type DateQuestion = BaseQuestion & {
  type: WorkformsQuestionType.Date;
  settings: DateQuestionSettings;
};

export type SingleSelectQuestion = BaseQuestion & {
  type: WorkformsQuestionType.SingleSelect;
  settings: SingleSelectQuestionSettings;
  options: SingleSelectOption[];
};

export type MultiSelectQuestion = BaseQuestion & {
  type: WorkformsQuestionType.MultiSelect;
  settings: MultiSelectQuestionSettings;
  options: MultiSelectOption[];
};

export type LocationQuestion = BaseQuestion & {
  type: WorkformsQuestionType.Location;
  settings: LocationQuestionSettings;
  options: LocationOption[];
};

export type RatingQuestion = BaseQuestion & {
  type: WorkformsQuestionType.Rating;
  settings: RatingQuestionSettings;
};

type PeopleQuestion = BaseQuestion & {
  type: WorkformsQuestionType.People;
  settings: PeopleQuestionSettings;
  options: PeopleOption[];
};

type LinkQuestion = BaseQuestion & {
  type: WorkformsQuestionType.Link;
  settings: LinkQuestionSettings;
};

type SubitemsQuestion = BaseQuestion & {
  type: WorkformsQuestionType.Subitems;
  settings: SubitemsQuestionSettings;
};

export type Question =
  | BaseQuestion
  | BooleanQuestion
  | DateQuestion
  | LocationQuestion
  | RatingQuestion
  | MultiSelectQuestion
  | PeopleQuestion
  | PhoneQuestion
  | SingleSelectQuestion
  | LinkQuestion
  | ConnectedBoardsQuestion
  | SubitemsQuestion;

export interface Form {
  id: number;
  token: string;
  active: boolean;
  title: string;
  ownerId?: number;
  createWithAI: boolean;
  builtWithAI: boolean;
  description: string | null;
  closeDate: string | null;
  questions: Question[];
  conditions: {
    [id: string]: Condition;
  };
  isSuspicious: boolean;
  isAnonymous: boolean;
  type: FormType;
  features: {
    isInternal: boolean;
    reCaptchaChallenge: boolean;
    shortenedLink: {
      enabled: boolean;
      url: string | null;
    };
    password: {
      enabled: boolean;
    };
    draftSubmission: {
      enabled: boolean;
    };
    requireLogin: {
      enabled: boolean;
      redirectToLogin: boolean;
    };
    responseLimit: {
      enabled: boolean;
      limit: number | null;
    };
    closeDate: {
      enabled: boolean;
      date: string | null;
    };
    preSubmissionView: {
      enabled: boolean;
      title: string | null;
      description: string | null;
      startButton: {
        text: string | null;
      };
    };
    postSubmissionView: {
      title: string | null;
      description: string | null;
      redirectAfterSubmission: {
        enabled: boolean;
        redirectUrl: string | null;
      };
      allowResubmit: boolean;
      showSuccessImage: boolean;
      allowEditSubmission: boolean;
      allowViewSubmission: boolean;
    };
    monday: {
      itemGroupId: string | null;
      includeNameQuestion: boolean;
      includeUpdateQuestion: boolean;
      syncQuestionAndColumnsTitles: boolean;
    };
    aiTranslate: {
      enabled: boolean;
    };
  };
  appearance: {
    hideBranding: boolean;
    showProgressBar: boolean;
    primaryColor: string | null;
    layout: {
      format: Format;
      alignment: Alignment;
      direction: Direction;
    };
    background:
      | { type: BackgroundType.Color; value: string | null }
      | { type: BackgroundType.Image; value: string }
      | { type: BackgroundType.None };
    text: {
      font: string | null;
      color: string | null;
      size: FontSize | null;
    };
    logo: {
      position: LogoPosition;
      url: string | null;
      size: LogoSize;
    };
    submitButton: {
      text: string | null;
    };
  };
  accessibility: {
    language: string | null;
    logoAltText: string | null;
  };
  tags: Tag[];
}
