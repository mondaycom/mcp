/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query SearchItemsDev($query: String!, $limit: Int!, $filters: SearchFiltersInput!) {\n    cross_entity_search(query: $query, limit: $limit, filters: $filters) {\n      __typename\n      ... on ItemSearchResult {\n        data {\n          id\n        }\n      }\n    }\n  }\n": typeof types.SearchItemsDevDocument,
    "\n  query SearchDev($query: String!, $limit: Int!, $filters: SearchFiltersInput!) {\n    cross_entity_search(query: $query, limit: $limit, filters: $filters) {\n      __typename\n      ... on BoardSearchResult {\n        entity_type\n        data {\n          id\n          name\n          url\n        }\n      }\n      ... on DocSearchResult {\n        entity_type\n        data {\n          id\n          name\n        }\n      }\n    }\n  }\n": typeof types.SearchDevDocument,
    "\n  mutation BatchUndo($boardId: ID!, $undoRecordId: ID!) {\n    batch_undo(board_id: $boardId, undo_record_id: $undoRecordId) {\n      success\n    }\n  }\n": typeof types.BatchUndoDocument,
    "\n  query getUserContext {\n    me {\n      id\n      name\n      title\n    }\n    favorites {\n      object {\n        id\n        type\n      }\n    }\n    intelligence {\n      relevant_boards(limit: 10) {\n        id\n        board {\n          name\n        }\n      }\n      relevant_people(limit: 10) {\n        id\n        user {\n          name\n        }\n      }\n    }\n  }\n": typeof types.GetUserContextDocument,
    "\n  fragment QuestionBasic on FormQuestion {\n    id\n    type\n    title\n    description\n    visible\n    required\n    page_block_id\n  }\n": typeof types.QuestionBasicFragmentDoc,
    "\n  fragment QuestionOptions on FormQuestion {\n    options {\n      label\n    }\n  }\n": typeof types.QuestionOptionsFragmentDoc,
    "\n  fragment QuestionSettings on FormQuestion {\n    settings {\n      prefill {\n        enabled\n        source\n        lookup\n      }\n      prefixAutofilled\n      prefixPredefined {\n        enabled\n        prefix\n      }\n      checkedByDefault\n      defaultCurrentDate\n      includeTime\n      display\n      optionsOrder\n      locationAutofilled\n      limit\n      skipValidation\n      label_limit_count\n      label_limit_count_enabled\n      default_answer\n    }\n  }\n": typeof types.QuestionSettingsFragmentDoc,
    "\n  fragment QuestionComplete on FormQuestion {\n    ...QuestionBasic\n    ...QuestionOptions\n    ...QuestionSettings\n    showIfRules\n  }\n  \n  \n  \n": typeof types.QuestionCompleteFragmentDoc,
    "\n  fragment FormFeatures on FormFeatures {\n    isInternal\n    reCaptchaChallenge\n    shortenedLink {\n      enabled\n      url\n    }\n    password {\n      enabled\n    }\n    draftSubmission {\n      enabled\n    }\n    requireLogin {\n      enabled\n      redirectToLogin\n    }\n    responseLimit {\n      enabled\n      limit\n    }\n    closeDate {\n      enabled\n      date\n    }\n    preSubmissionView {\n      enabled\n      title\n      description\n      startButton {\n        text\n      }\n    }\n    afterSubmissionView {\n      title\n      description\n      redirectAfterSubmission {\n        enabled\n        redirectUrl\n      }\n      allowResubmit\n      showSuccessImage\n      allowEditSubmission\n      allowViewSubmission\n    }\n    monday {\n      itemGroupId\n      includeNameQuestion\n      includeUpdateQuestion\n      syncQuestionAndColumnsTitles\n    }\n  }\n": typeof types.FormFeaturesFragmentDoc,
    "\n  fragment FormAppearance on FormAppearance {\n    hideBranding\n    showProgressBar\n    primaryColor\n    layout {\n      type\n      alignment\n      direction\n    }\n    background {\n      type\n      value\n    }\n    text {\n      font\n      color\n      size\n    }\n    logo {\n      position\n      url\n      size\n    }\n    submitButton {\n      text\n    }\n  }\n": typeof types.FormAppearanceFragmentDoc,
    "\n  fragment FormAccessibility on FormAccessibility {\n    language\n    logoAltText\n  }\n": typeof types.FormAccessibilityFragmentDoc,
    "\n  fragment FormTag on FormTag {\n    id\n    name\n    value\n    columnId\n  }\n": typeof types.FormTagFragmentDoc,
    "\n  mutation createForm(\n    $destination_workspace_id: ID!\n    $destination_folder_id: ID\n    $destination_folder_name: String\n    $board_kind: BoardKind\n    $destination_name: String\n    $board_owner_ids: [ID!]\n    $board_owner_team_ids: [ID!]\n    $board_subscriber_ids: [ID!]\n    $board_subscriber_teams_ids: [ID!]\n  ) {\n    create_form(\n      destination_workspace_id: $destination_workspace_id\n      destination_folder_id: $destination_folder_id\n      destination_folder_name: $destination_folder_name\n      board_kind: $board_kind\n      destination_name: $destination_name\n      board_owner_ids: $board_owner_ids\n      board_owner_team_ids: $board_owner_team_ids\n      board_subscriber_ids: $board_subscriber_ids\n      board_subscriber_teams_ids: $board_subscriber_teams_ids\n    ) {\n      boardId\n      token\n    }\n  }\n": typeof types.CreateFormDocument,
    "\n  query getForm($formToken: String!) {\n    form(formToken: $formToken) {\n      id\n      token\n      title\n      description\n      active\n      ownerId\n      type\n      builtWithAI\n      isAnonymous\n      questions {\n        ...QuestionComplete\n      }\n      features {\n        ...FormFeatures\n      }\n      appearance {\n        ...FormAppearance\n      }\n      accessibility {\n        ...FormAccessibility\n      }\n      tags {\n        ...FormTag\n      }\n    }\n  }\n  \n  \n  \n  \n  \n": typeof types.GetFormDocument,
    "\n  mutation deleteFormQuestion($formToken: String!, $questionId: String!) {\n    delete_question(formToken: $formToken, questionId: $questionId)\n  }\n": typeof types.DeleteFormQuestionDocument,
    "\n  mutation createFormQuestion($formToken: String!, $question: CreateQuestionInput!) {\n    create_form_question(formToken: $formToken, question: $question) {\n      ...QuestionBasic\n      ...QuestionOptions\n      ...QuestionSettings\n    }\n  }\n  \n  \n  \n": typeof types.CreateFormQuestionDocument,
    "\n  mutation updateFormQuestion($formToken: String!, $questionId: String!, $question: UpdateQuestionInput!) {\n    update_form_question(formToken: $formToken, questionId: $questionId, question: $question) {\n      ...QuestionBasic\n      ...QuestionOptions\n      ...QuestionSettings\n    }\n  }\n  \n  \n  \n": typeof types.UpdateFormQuestionDocument,
    "\n  mutation updateForm($formToken: String!, $input: UpdateFormInput!) {\n    update_form(formToken: $formToken, input: $input) {\n      title\n      description\n      questions {\n        id\n      }\n    }\n  }\n": typeof types.UpdateFormDocument,
    "\n  mutation updateFormSettings($formToken: String!, $settings: UpdateFormSettingsInput!) {\n    update_form_settings(formToken: $formToken, settings: $settings) {\n      features {\n        ...FormFeatures\n      }\n      appearance {\n        ...FormAppearance\n      }\n      accessibility {\n        ...FormAccessibility\n      }\n    }\n  }\n  \n  \n  \n": typeof types.UpdateFormSettingsDocument,
    "\n  mutation setFormPassword($formToken: String!, $input: SetFormPasswordInput!) {\n    set_form_password(formToken: $formToken, input: $input) {\n      id\n    }\n  }\n": typeof types.SetFormPasswordDocument,
    "\n  mutation shortenFormUrl($formToken: String!) {\n    shorten_form_url(formToken: $formToken) {\n      enabled\n      url\n    }\n  }\n": typeof types.ShortenFormUrlDocument,
    "\n  mutation deactivateForm($formToken: String!) {\n    deactivate_form(formToken: $formToken)\n  }\n": typeof types.DeactivateFormDocument,
    "\n  mutation activateForm($formToken: String!) {\n    activate_form(formToken: $formToken)\n  }\n": typeof types.ActivateFormDocument,
    "\n  mutation deleteFormTag($formToken: String!, $tagId: String!) {\n    delete_form_tag(formToken: $formToken, tagId: $tagId)\n  }\n": typeof types.DeleteFormTagDocument,
    "\n  mutation createFormTag($formToken: String!, $tag: CreateFormTagInput!) {\n    create_form_tag(formToken: $formToken, tag: $tag) {\n      ...FormTag\n    }\n  }\n  \n": typeof types.CreateFormTagDocument,
    "\n  mutation updateFormTag($formToken: String!, $tagId: String!, $tag: UpdateFormTagInput!) {\n    update_form_tag(formToken: $formToken, tagId: $tagId, tag: $tag)\n  }\n": typeof types.UpdateFormTagDocument,
    "\n  mutation updateFormAppearance($formToken: String!, $appearance: FormAppearanceInput!) {\n    update_form_settings(formToken: $formToken, settings: { appearance: $appearance }) {\n      appearance {\n        ...FormAppearance\n      }\n    }\n  }\n  \n": typeof types.UpdateFormAppearanceDocument,
    "\n  mutation updateFormAccessibility($formToken: String!, $accessibility: FormAccessibilityInput!) {\n    update_form_settings(formToken: $formToken, settings: { accessibility: $accessibility }) {\n      accessibility {\n        ...FormAccessibility\n      }\n    }\n  }\n  \n": typeof types.UpdateFormAccessibilityDocument,
    "\n  mutation updateFormFeatures($formToken: String!, $features: FormFeaturesInput!) {\n    update_form_settings(formToken: $formToken, settings: { features: $features }) {\n      features {\n        ...FormFeatures\n      }\n    }\n  }\n  \n": typeof types.UpdateFormFeaturesDocument,
    "\n  mutation updateFormQuestionOrder($formToken: String!, $questions: [QuestionOrderInput!]!) {\n    update_form(formToken: $formToken, input: { questions: $questions }) {\n      questions {\n        id\n        page_block_id\n      }\n    }\n  }\n": typeof types.UpdateFormQuestionOrderDocument,
    "\n  mutation updateFormHeader($formToken: String!, $title: String, $description: String) {\n    update_form(formToken: $formToken, input: { title: $title, description: $description }) {\n      title\n      description\n    }\n  }\n": typeof types.UpdateFormHeaderDocument,
};
const documents: Documents = {
    "\n  query SearchItemsDev($query: String!, $limit: Int!, $filters: SearchFiltersInput!) {\n    cross_entity_search(query: $query, limit: $limit, filters: $filters) {\n      __typename\n      ... on ItemSearchResult {\n        data {\n          id\n        }\n      }\n    }\n  }\n": types.SearchItemsDevDocument,
    "\n  query SearchDev($query: String!, $limit: Int!, $filters: SearchFiltersInput!) {\n    cross_entity_search(query: $query, limit: $limit, filters: $filters) {\n      __typename\n      ... on BoardSearchResult {\n        entity_type\n        data {\n          id\n          name\n          url\n        }\n      }\n      ... on DocSearchResult {\n        entity_type\n        data {\n          id\n          name\n        }\n      }\n    }\n  }\n": types.SearchDevDocument,
    "\n  mutation BatchUndo($boardId: ID!, $undoRecordId: ID!) {\n    batch_undo(board_id: $boardId, undo_record_id: $undoRecordId) {\n      success\n    }\n  }\n": types.BatchUndoDocument,
    "\n  query getUserContext {\n    me {\n      id\n      name\n      title\n    }\n    favorites {\n      object {\n        id\n        type\n      }\n    }\n    intelligence {\n      relevant_boards(limit: 10) {\n        id\n        board {\n          name\n        }\n      }\n      relevant_people(limit: 10) {\n        id\n        user {\n          name\n        }\n      }\n    }\n  }\n": types.GetUserContextDocument,
    "\n  fragment QuestionBasic on FormQuestion {\n    id\n    type\n    title\n    description\n    visible\n    required\n    page_block_id\n  }\n": types.QuestionBasicFragmentDoc,
    "\n  fragment QuestionOptions on FormQuestion {\n    options {\n      label\n    }\n  }\n": types.QuestionOptionsFragmentDoc,
    "\n  fragment QuestionSettings on FormQuestion {\n    settings {\n      prefill {\n        enabled\n        source\n        lookup\n      }\n      prefixAutofilled\n      prefixPredefined {\n        enabled\n        prefix\n      }\n      checkedByDefault\n      defaultCurrentDate\n      includeTime\n      display\n      optionsOrder\n      locationAutofilled\n      limit\n      skipValidation\n      label_limit_count\n      label_limit_count_enabled\n      default_answer\n    }\n  }\n": types.QuestionSettingsFragmentDoc,
    "\n  fragment QuestionComplete on FormQuestion {\n    ...QuestionBasic\n    ...QuestionOptions\n    ...QuestionSettings\n    showIfRules\n  }\n  \n  \n  \n": types.QuestionCompleteFragmentDoc,
    "\n  fragment FormFeatures on FormFeatures {\n    isInternal\n    reCaptchaChallenge\n    shortenedLink {\n      enabled\n      url\n    }\n    password {\n      enabled\n    }\n    draftSubmission {\n      enabled\n    }\n    requireLogin {\n      enabled\n      redirectToLogin\n    }\n    responseLimit {\n      enabled\n      limit\n    }\n    closeDate {\n      enabled\n      date\n    }\n    preSubmissionView {\n      enabled\n      title\n      description\n      startButton {\n        text\n      }\n    }\n    afterSubmissionView {\n      title\n      description\n      redirectAfterSubmission {\n        enabled\n        redirectUrl\n      }\n      allowResubmit\n      showSuccessImage\n      allowEditSubmission\n      allowViewSubmission\n    }\n    monday {\n      itemGroupId\n      includeNameQuestion\n      includeUpdateQuestion\n      syncQuestionAndColumnsTitles\n    }\n  }\n": types.FormFeaturesFragmentDoc,
    "\n  fragment FormAppearance on FormAppearance {\n    hideBranding\n    showProgressBar\n    primaryColor\n    layout {\n      type\n      alignment\n      direction\n    }\n    background {\n      type\n      value\n    }\n    text {\n      font\n      color\n      size\n    }\n    logo {\n      position\n      url\n      size\n    }\n    submitButton {\n      text\n    }\n  }\n": types.FormAppearanceFragmentDoc,
    "\n  fragment FormAccessibility on FormAccessibility {\n    language\n    logoAltText\n  }\n": types.FormAccessibilityFragmentDoc,
    "\n  fragment FormTag on FormTag {\n    id\n    name\n    value\n    columnId\n  }\n": types.FormTagFragmentDoc,
    "\n  mutation createForm(\n    $destination_workspace_id: ID!\n    $destination_folder_id: ID\n    $destination_folder_name: String\n    $board_kind: BoardKind\n    $destination_name: String\n    $board_owner_ids: [ID!]\n    $board_owner_team_ids: [ID!]\n    $board_subscriber_ids: [ID!]\n    $board_subscriber_teams_ids: [ID!]\n  ) {\n    create_form(\n      destination_workspace_id: $destination_workspace_id\n      destination_folder_id: $destination_folder_id\n      destination_folder_name: $destination_folder_name\n      board_kind: $board_kind\n      destination_name: $destination_name\n      board_owner_ids: $board_owner_ids\n      board_owner_team_ids: $board_owner_team_ids\n      board_subscriber_ids: $board_subscriber_ids\n      board_subscriber_teams_ids: $board_subscriber_teams_ids\n    ) {\n      boardId\n      token\n    }\n  }\n": types.CreateFormDocument,
    "\n  query getForm($formToken: String!) {\n    form(formToken: $formToken) {\n      id\n      token\n      title\n      description\n      active\n      ownerId\n      type\n      builtWithAI\n      isAnonymous\n      questions {\n        ...QuestionComplete\n      }\n      features {\n        ...FormFeatures\n      }\n      appearance {\n        ...FormAppearance\n      }\n      accessibility {\n        ...FormAccessibility\n      }\n      tags {\n        ...FormTag\n      }\n    }\n  }\n  \n  \n  \n  \n  \n": types.GetFormDocument,
    "\n  mutation deleteFormQuestion($formToken: String!, $questionId: String!) {\n    delete_question(formToken: $formToken, questionId: $questionId)\n  }\n": types.DeleteFormQuestionDocument,
    "\n  mutation createFormQuestion($formToken: String!, $question: CreateQuestionInput!) {\n    create_form_question(formToken: $formToken, question: $question) {\n      ...QuestionBasic\n      ...QuestionOptions\n      ...QuestionSettings\n    }\n  }\n  \n  \n  \n": types.CreateFormQuestionDocument,
    "\n  mutation updateFormQuestion($formToken: String!, $questionId: String!, $question: UpdateQuestionInput!) {\n    update_form_question(formToken: $formToken, questionId: $questionId, question: $question) {\n      ...QuestionBasic\n      ...QuestionOptions\n      ...QuestionSettings\n    }\n  }\n  \n  \n  \n": types.UpdateFormQuestionDocument,
    "\n  mutation updateForm($formToken: String!, $input: UpdateFormInput!) {\n    update_form(formToken: $formToken, input: $input) {\n      title\n      description\n      questions {\n        id\n      }\n    }\n  }\n": types.UpdateFormDocument,
    "\n  mutation updateFormSettings($formToken: String!, $settings: UpdateFormSettingsInput!) {\n    update_form_settings(formToken: $formToken, settings: $settings) {\n      features {\n        ...FormFeatures\n      }\n      appearance {\n        ...FormAppearance\n      }\n      accessibility {\n        ...FormAccessibility\n      }\n    }\n  }\n  \n  \n  \n": types.UpdateFormSettingsDocument,
    "\n  mutation setFormPassword($formToken: String!, $input: SetFormPasswordInput!) {\n    set_form_password(formToken: $formToken, input: $input) {\n      id\n    }\n  }\n": types.SetFormPasswordDocument,
    "\n  mutation shortenFormUrl($formToken: String!) {\n    shorten_form_url(formToken: $formToken) {\n      enabled\n      url\n    }\n  }\n": types.ShortenFormUrlDocument,
    "\n  mutation deactivateForm($formToken: String!) {\n    deactivate_form(formToken: $formToken)\n  }\n": types.DeactivateFormDocument,
    "\n  mutation activateForm($formToken: String!) {\n    activate_form(formToken: $formToken)\n  }\n": types.ActivateFormDocument,
    "\n  mutation deleteFormTag($formToken: String!, $tagId: String!) {\n    delete_form_tag(formToken: $formToken, tagId: $tagId)\n  }\n": types.DeleteFormTagDocument,
    "\n  mutation createFormTag($formToken: String!, $tag: CreateFormTagInput!) {\n    create_form_tag(formToken: $formToken, tag: $tag) {\n      ...FormTag\n    }\n  }\n  \n": types.CreateFormTagDocument,
    "\n  mutation updateFormTag($formToken: String!, $tagId: String!, $tag: UpdateFormTagInput!) {\n    update_form_tag(formToken: $formToken, tagId: $tagId, tag: $tag)\n  }\n": types.UpdateFormTagDocument,
    "\n  mutation updateFormAppearance($formToken: String!, $appearance: FormAppearanceInput!) {\n    update_form_settings(formToken: $formToken, settings: { appearance: $appearance }) {\n      appearance {\n        ...FormAppearance\n      }\n    }\n  }\n  \n": types.UpdateFormAppearanceDocument,
    "\n  mutation updateFormAccessibility($formToken: String!, $accessibility: FormAccessibilityInput!) {\n    update_form_settings(formToken: $formToken, settings: { accessibility: $accessibility }) {\n      accessibility {\n        ...FormAccessibility\n      }\n    }\n  }\n  \n": types.UpdateFormAccessibilityDocument,
    "\n  mutation updateFormFeatures($formToken: String!, $features: FormFeaturesInput!) {\n    update_form_settings(formToken: $formToken, settings: { features: $features }) {\n      features {\n        ...FormFeatures\n      }\n    }\n  }\n  \n": types.UpdateFormFeaturesDocument,
    "\n  mutation updateFormQuestionOrder($formToken: String!, $questions: [QuestionOrderInput!]!) {\n    update_form(formToken: $formToken, input: { questions: $questions }) {\n      questions {\n        id\n        page_block_id\n      }\n    }\n  }\n": types.UpdateFormQuestionOrderDocument,
    "\n  mutation updateFormHeader($formToken: String!, $title: String, $description: String) {\n    update_form(formToken: $formToken, input: { title: $title, description: $description }) {\n      title\n      description\n    }\n  }\n": types.UpdateFormHeaderDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SearchItemsDev($query: String!, $limit: Int!, $filters: SearchFiltersInput!) {\n    cross_entity_search(query: $query, limit: $limit, filters: $filters) {\n      __typename\n      ... on ItemSearchResult {\n        data {\n          id\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query SearchItemsDev($query: String!, $limit: Int!, $filters: SearchFiltersInput!) {\n    cross_entity_search(query: $query, limit: $limit, filters: $filters) {\n      __typename\n      ... on ItemSearchResult {\n        data {\n          id\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SearchDev($query: String!, $limit: Int!, $filters: SearchFiltersInput!) {\n    cross_entity_search(query: $query, limit: $limit, filters: $filters) {\n      __typename\n      ... on BoardSearchResult {\n        entity_type\n        data {\n          id\n          name\n          url\n        }\n      }\n      ... on DocSearchResult {\n        entity_type\n        data {\n          id\n          name\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query SearchDev($query: String!, $limit: Int!, $filters: SearchFiltersInput!) {\n    cross_entity_search(query: $query, limit: $limit, filters: $filters) {\n      __typename\n      ... on BoardSearchResult {\n        entity_type\n        data {\n          id\n          name\n          url\n        }\n      }\n      ... on DocSearchResult {\n        entity_type\n        data {\n          id\n          name\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation BatchUndo($boardId: ID!, $undoRecordId: ID!) {\n    batch_undo(board_id: $boardId, undo_record_id: $undoRecordId) {\n      success\n    }\n  }\n"): (typeof documents)["\n  mutation BatchUndo($boardId: ID!, $undoRecordId: ID!) {\n    batch_undo(board_id: $boardId, undo_record_id: $undoRecordId) {\n      success\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query getUserContext {\n    me {\n      id\n      name\n      title\n    }\n    favorites {\n      object {\n        id\n        type\n      }\n    }\n    intelligence {\n      relevant_boards(limit: 10) {\n        id\n        board {\n          name\n        }\n      }\n      relevant_people(limit: 10) {\n        id\n        user {\n          name\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query getUserContext {\n    me {\n      id\n      name\n      title\n    }\n    favorites {\n      object {\n        id\n        type\n      }\n    }\n    intelligence {\n      relevant_boards(limit: 10) {\n        id\n        board {\n          name\n        }\n      }\n      relevant_people(limit: 10) {\n        id\n        user {\n          name\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment QuestionBasic on FormQuestion {\n    id\n    type\n    title\n    description\n    visible\n    required\n    page_block_id\n  }\n"): (typeof documents)["\n  fragment QuestionBasic on FormQuestion {\n    id\n    type\n    title\n    description\n    visible\n    required\n    page_block_id\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment QuestionOptions on FormQuestion {\n    options {\n      label\n    }\n  }\n"): (typeof documents)["\n  fragment QuestionOptions on FormQuestion {\n    options {\n      label\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment QuestionSettings on FormQuestion {\n    settings {\n      prefill {\n        enabled\n        source\n        lookup\n      }\n      prefixAutofilled\n      prefixPredefined {\n        enabled\n        prefix\n      }\n      checkedByDefault\n      defaultCurrentDate\n      includeTime\n      display\n      optionsOrder\n      locationAutofilled\n      limit\n      skipValidation\n      label_limit_count\n      label_limit_count_enabled\n      default_answer\n    }\n  }\n"): (typeof documents)["\n  fragment QuestionSettings on FormQuestion {\n    settings {\n      prefill {\n        enabled\n        source\n        lookup\n      }\n      prefixAutofilled\n      prefixPredefined {\n        enabled\n        prefix\n      }\n      checkedByDefault\n      defaultCurrentDate\n      includeTime\n      display\n      optionsOrder\n      locationAutofilled\n      limit\n      skipValidation\n      label_limit_count\n      label_limit_count_enabled\n      default_answer\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment QuestionComplete on FormQuestion {\n    ...QuestionBasic\n    ...QuestionOptions\n    ...QuestionSettings\n    showIfRules\n  }\n  \n  \n  \n"): (typeof documents)["\n  fragment QuestionComplete on FormQuestion {\n    ...QuestionBasic\n    ...QuestionOptions\n    ...QuestionSettings\n    showIfRules\n  }\n  \n  \n  \n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment FormFeatures on FormFeatures {\n    isInternal\n    reCaptchaChallenge\n    shortenedLink {\n      enabled\n      url\n    }\n    password {\n      enabled\n    }\n    draftSubmission {\n      enabled\n    }\n    requireLogin {\n      enabled\n      redirectToLogin\n    }\n    responseLimit {\n      enabled\n      limit\n    }\n    closeDate {\n      enabled\n      date\n    }\n    preSubmissionView {\n      enabled\n      title\n      description\n      startButton {\n        text\n      }\n    }\n    afterSubmissionView {\n      title\n      description\n      redirectAfterSubmission {\n        enabled\n        redirectUrl\n      }\n      allowResubmit\n      showSuccessImage\n      allowEditSubmission\n      allowViewSubmission\n    }\n    monday {\n      itemGroupId\n      includeNameQuestion\n      includeUpdateQuestion\n      syncQuestionAndColumnsTitles\n    }\n  }\n"): (typeof documents)["\n  fragment FormFeatures on FormFeatures {\n    isInternal\n    reCaptchaChallenge\n    shortenedLink {\n      enabled\n      url\n    }\n    password {\n      enabled\n    }\n    draftSubmission {\n      enabled\n    }\n    requireLogin {\n      enabled\n      redirectToLogin\n    }\n    responseLimit {\n      enabled\n      limit\n    }\n    closeDate {\n      enabled\n      date\n    }\n    preSubmissionView {\n      enabled\n      title\n      description\n      startButton {\n        text\n      }\n    }\n    afterSubmissionView {\n      title\n      description\n      redirectAfterSubmission {\n        enabled\n        redirectUrl\n      }\n      allowResubmit\n      showSuccessImage\n      allowEditSubmission\n      allowViewSubmission\n    }\n    monday {\n      itemGroupId\n      includeNameQuestion\n      includeUpdateQuestion\n      syncQuestionAndColumnsTitles\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment FormAppearance on FormAppearance {\n    hideBranding\n    showProgressBar\n    primaryColor\n    layout {\n      type\n      alignment\n      direction\n    }\n    background {\n      type\n      value\n    }\n    text {\n      font\n      color\n      size\n    }\n    logo {\n      position\n      url\n      size\n    }\n    submitButton {\n      text\n    }\n  }\n"): (typeof documents)["\n  fragment FormAppearance on FormAppearance {\n    hideBranding\n    showProgressBar\n    primaryColor\n    layout {\n      type\n      alignment\n      direction\n    }\n    background {\n      type\n      value\n    }\n    text {\n      font\n      color\n      size\n    }\n    logo {\n      position\n      url\n      size\n    }\n    submitButton {\n      text\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment FormAccessibility on FormAccessibility {\n    language\n    logoAltText\n  }\n"): (typeof documents)["\n  fragment FormAccessibility on FormAccessibility {\n    language\n    logoAltText\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment FormTag on FormTag {\n    id\n    name\n    value\n    columnId\n  }\n"): (typeof documents)["\n  fragment FormTag on FormTag {\n    id\n    name\n    value\n    columnId\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation createForm(\n    $destination_workspace_id: ID!\n    $destination_folder_id: ID\n    $destination_folder_name: String\n    $board_kind: BoardKind\n    $destination_name: String\n    $board_owner_ids: [ID!]\n    $board_owner_team_ids: [ID!]\n    $board_subscriber_ids: [ID!]\n    $board_subscriber_teams_ids: [ID!]\n  ) {\n    create_form(\n      destination_workspace_id: $destination_workspace_id\n      destination_folder_id: $destination_folder_id\n      destination_folder_name: $destination_folder_name\n      board_kind: $board_kind\n      destination_name: $destination_name\n      board_owner_ids: $board_owner_ids\n      board_owner_team_ids: $board_owner_team_ids\n      board_subscriber_ids: $board_subscriber_ids\n      board_subscriber_teams_ids: $board_subscriber_teams_ids\n    ) {\n      boardId\n      token\n    }\n  }\n"): (typeof documents)["\n  mutation createForm(\n    $destination_workspace_id: ID!\n    $destination_folder_id: ID\n    $destination_folder_name: String\n    $board_kind: BoardKind\n    $destination_name: String\n    $board_owner_ids: [ID!]\n    $board_owner_team_ids: [ID!]\n    $board_subscriber_ids: [ID!]\n    $board_subscriber_teams_ids: [ID!]\n  ) {\n    create_form(\n      destination_workspace_id: $destination_workspace_id\n      destination_folder_id: $destination_folder_id\n      destination_folder_name: $destination_folder_name\n      board_kind: $board_kind\n      destination_name: $destination_name\n      board_owner_ids: $board_owner_ids\n      board_owner_team_ids: $board_owner_team_ids\n      board_subscriber_ids: $board_subscriber_ids\n      board_subscriber_teams_ids: $board_subscriber_teams_ids\n    ) {\n      boardId\n      token\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query getForm($formToken: String!) {\n    form(formToken: $formToken) {\n      id\n      token\n      title\n      description\n      active\n      ownerId\n      type\n      builtWithAI\n      isAnonymous\n      questions {\n        ...QuestionComplete\n      }\n      features {\n        ...FormFeatures\n      }\n      appearance {\n        ...FormAppearance\n      }\n      accessibility {\n        ...FormAccessibility\n      }\n      tags {\n        ...FormTag\n      }\n    }\n  }\n  \n  \n  \n  \n  \n"): (typeof documents)["\n  query getForm($formToken: String!) {\n    form(formToken: $formToken) {\n      id\n      token\n      title\n      description\n      active\n      ownerId\n      type\n      builtWithAI\n      isAnonymous\n      questions {\n        ...QuestionComplete\n      }\n      features {\n        ...FormFeatures\n      }\n      appearance {\n        ...FormAppearance\n      }\n      accessibility {\n        ...FormAccessibility\n      }\n      tags {\n        ...FormTag\n      }\n    }\n  }\n  \n  \n  \n  \n  \n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation deleteFormQuestion($formToken: String!, $questionId: String!) {\n    delete_question(formToken: $formToken, questionId: $questionId)\n  }\n"): (typeof documents)["\n  mutation deleteFormQuestion($formToken: String!, $questionId: String!) {\n    delete_question(formToken: $formToken, questionId: $questionId)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation createFormQuestion($formToken: String!, $question: CreateQuestionInput!) {\n    create_form_question(formToken: $formToken, question: $question) {\n      ...QuestionBasic\n      ...QuestionOptions\n      ...QuestionSettings\n    }\n  }\n  \n  \n  \n"): (typeof documents)["\n  mutation createFormQuestion($formToken: String!, $question: CreateQuestionInput!) {\n    create_form_question(formToken: $formToken, question: $question) {\n      ...QuestionBasic\n      ...QuestionOptions\n      ...QuestionSettings\n    }\n  }\n  \n  \n  \n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation updateFormQuestion($formToken: String!, $questionId: String!, $question: UpdateQuestionInput!) {\n    update_form_question(formToken: $formToken, questionId: $questionId, question: $question) {\n      ...QuestionBasic\n      ...QuestionOptions\n      ...QuestionSettings\n    }\n  }\n  \n  \n  \n"): (typeof documents)["\n  mutation updateFormQuestion($formToken: String!, $questionId: String!, $question: UpdateQuestionInput!) {\n    update_form_question(formToken: $formToken, questionId: $questionId, question: $question) {\n      ...QuestionBasic\n      ...QuestionOptions\n      ...QuestionSettings\n    }\n  }\n  \n  \n  \n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation updateForm($formToken: String!, $input: UpdateFormInput!) {\n    update_form(formToken: $formToken, input: $input) {\n      title\n      description\n      questions {\n        id\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation updateForm($formToken: String!, $input: UpdateFormInput!) {\n    update_form(formToken: $formToken, input: $input) {\n      title\n      description\n      questions {\n        id\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation updateFormSettings($formToken: String!, $settings: UpdateFormSettingsInput!) {\n    update_form_settings(formToken: $formToken, settings: $settings) {\n      features {\n        ...FormFeatures\n      }\n      appearance {\n        ...FormAppearance\n      }\n      accessibility {\n        ...FormAccessibility\n      }\n    }\n  }\n  \n  \n  \n"): (typeof documents)["\n  mutation updateFormSettings($formToken: String!, $settings: UpdateFormSettingsInput!) {\n    update_form_settings(formToken: $formToken, settings: $settings) {\n      features {\n        ...FormFeatures\n      }\n      appearance {\n        ...FormAppearance\n      }\n      accessibility {\n        ...FormAccessibility\n      }\n    }\n  }\n  \n  \n  \n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation setFormPassword($formToken: String!, $input: SetFormPasswordInput!) {\n    set_form_password(formToken: $formToken, input: $input) {\n      id\n    }\n  }\n"): (typeof documents)["\n  mutation setFormPassword($formToken: String!, $input: SetFormPasswordInput!) {\n    set_form_password(formToken: $formToken, input: $input) {\n      id\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation shortenFormUrl($formToken: String!) {\n    shorten_form_url(formToken: $formToken) {\n      enabled\n      url\n    }\n  }\n"): (typeof documents)["\n  mutation shortenFormUrl($formToken: String!) {\n    shorten_form_url(formToken: $formToken) {\n      enabled\n      url\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation deactivateForm($formToken: String!) {\n    deactivate_form(formToken: $formToken)\n  }\n"): (typeof documents)["\n  mutation deactivateForm($formToken: String!) {\n    deactivate_form(formToken: $formToken)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation activateForm($formToken: String!) {\n    activate_form(formToken: $formToken)\n  }\n"): (typeof documents)["\n  mutation activateForm($formToken: String!) {\n    activate_form(formToken: $formToken)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation deleteFormTag($formToken: String!, $tagId: String!) {\n    delete_form_tag(formToken: $formToken, tagId: $tagId)\n  }\n"): (typeof documents)["\n  mutation deleteFormTag($formToken: String!, $tagId: String!) {\n    delete_form_tag(formToken: $formToken, tagId: $tagId)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation createFormTag($formToken: String!, $tag: CreateFormTagInput!) {\n    create_form_tag(formToken: $formToken, tag: $tag) {\n      ...FormTag\n    }\n  }\n  \n"): (typeof documents)["\n  mutation createFormTag($formToken: String!, $tag: CreateFormTagInput!) {\n    create_form_tag(formToken: $formToken, tag: $tag) {\n      ...FormTag\n    }\n  }\n  \n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation updateFormTag($formToken: String!, $tagId: String!, $tag: UpdateFormTagInput!) {\n    update_form_tag(formToken: $formToken, tagId: $tagId, tag: $tag)\n  }\n"): (typeof documents)["\n  mutation updateFormTag($formToken: String!, $tagId: String!, $tag: UpdateFormTagInput!) {\n    update_form_tag(formToken: $formToken, tagId: $tagId, tag: $tag)\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation updateFormAppearance($formToken: String!, $appearance: FormAppearanceInput!) {\n    update_form_settings(formToken: $formToken, settings: { appearance: $appearance }) {\n      appearance {\n        ...FormAppearance\n      }\n    }\n  }\n  \n"): (typeof documents)["\n  mutation updateFormAppearance($formToken: String!, $appearance: FormAppearanceInput!) {\n    update_form_settings(formToken: $formToken, settings: { appearance: $appearance }) {\n      appearance {\n        ...FormAppearance\n      }\n    }\n  }\n  \n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation updateFormAccessibility($formToken: String!, $accessibility: FormAccessibilityInput!) {\n    update_form_settings(formToken: $formToken, settings: { accessibility: $accessibility }) {\n      accessibility {\n        ...FormAccessibility\n      }\n    }\n  }\n  \n"): (typeof documents)["\n  mutation updateFormAccessibility($formToken: String!, $accessibility: FormAccessibilityInput!) {\n    update_form_settings(formToken: $formToken, settings: { accessibility: $accessibility }) {\n      accessibility {\n        ...FormAccessibility\n      }\n    }\n  }\n  \n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation updateFormFeatures($formToken: String!, $features: FormFeaturesInput!) {\n    update_form_settings(formToken: $formToken, settings: { features: $features }) {\n      features {\n        ...FormFeatures\n      }\n    }\n  }\n  \n"): (typeof documents)["\n  mutation updateFormFeatures($formToken: String!, $features: FormFeaturesInput!) {\n    update_form_settings(formToken: $formToken, settings: { features: $features }) {\n      features {\n        ...FormFeatures\n      }\n    }\n  }\n  \n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation updateFormQuestionOrder($formToken: String!, $questions: [QuestionOrderInput!]!) {\n    update_form(formToken: $formToken, input: { questions: $questions }) {\n      questions {\n        id\n        page_block_id\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation updateFormQuestionOrder($formToken: String!, $questions: [QuestionOrderInput!]!) {\n    update_form(formToken: $formToken, input: { questions: $questions }) {\n      questions {\n        id\n        page_block_id\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation updateFormHeader($formToken: String!, $title: String, $description: String) {\n    update_form(formToken: $formToken, input: { title: $title, description: $description }) {\n      title\n      description\n    }\n  }\n"): (typeof documents)["\n  mutation updateFormHeader($formToken: String!, $title: String, $description: String) {\n    update_form(formToken: $formToken, input: { title: $title, description: $description }) {\n      title\n      description\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;