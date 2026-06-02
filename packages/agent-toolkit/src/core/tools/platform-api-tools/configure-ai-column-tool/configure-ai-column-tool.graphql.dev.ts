import { gql } from 'graphql-request';

export const configureCategorizeAiColumnMutation = gql`
  mutation ConfigureCategorizeAiColumn(
    $boardId: ID!
    $columnId: ID!
    $sourceType: AiColumnSource!
    $sourceColumnId: ID
    $additionalInstructions: String
    $extraSettings: AiColumnExtraSettingsInput
  ) {
    configure_categorize_ai_column(
      board_id: $boardId
      column_id: $columnId
      source_type: $sourceType
      source_column_id: $sourceColumnId
      additional_instructions: $additionalInstructions
      extra_settings: $extraSettings
    ) {
      column_id
    }
  }
`;

export const configureSummarizeAiColumnMutation = gql`
  mutation ConfigureSummarizeAiColumn(
    $boardId: ID!
    $columnId: ID!
    $sourceType: AiColumnSource!
    $sourceColumnId: ID
    $additionalInstructions: String
    $extraSettings: AiColumnExtraSettingsInput
  ) {
    configure_summarize_ai_column(
      board_id: $boardId
      column_id: $columnId
      source_type: $sourceType
      source_column_id: $sourceColumnId
      additional_instructions: $additionalInstructions
      extra_settings: $extraSettings
    ) {
      column_id
    }
  }
`;

export const configureTranslateAiColumnMutation = gql`
  mutation ConfigureTranslateAiColumn(
    $boardId: ID!
    $columnId: ID!
    $sourceType: AiColumnSource!
    $sourceColumnId: ID
    $targetLanguage: AiColumnLanguage!
    $extraSettings: AiColumnExtraSettingsInput
  ) {
    configure_translate_ai_column(
      board_id: $boardId
      column_id: $columnId
      source_type: $sourceType
      source_column_id: $sourceColumnId
      target_language: $targetLanguage
      extra_settings: $extraSettings
    ) {
      column_id
    }
  }
`;

export const configureImproveTextAiColumnMutation = gql`
  mutation ConfigureImproveTextAiColumn(
    $boardId: ID!
    $columnId: ID!
    $sourceType: AiColumnSource!
    $sourceColumnId: ID
    $tone: AiColumnTone
    $length: AiColumnImproverLength
    $refinementType: AiColumnRefinementLevel
    $extraSettings: AiColumnExtraSettingsInput
  ) {
    configure_improve_text_ai_column(
      board_id: $boardId
      column_id: $columnId
      source_type: $sourceType
      source_column_id: $sourceColumnId
      tone: $tone
      length: $length
      refinement_type: $refinementType
      extra_settings: $extraSettings
    ) {
      column_id
    }
  }
`;

export const configureExtractAiColumnMutation = gql`
  mutation ConfigureExtractAiColumn(
    $boardId: ID!
    $columnId: ID!
    $sourceType: AiColumnSource!
    $sourceColumnId: ID
    $entityType: AiColumnEntity!
    $customInstructions: String
    $additionalInstructions: String
    $extraSettings: AiColumnExtraSettingsInput
  ) {
    configure_extract_ai_column(
      board_id: $boardId
      column_id: $columnId
      source_type: $sourceType
      source_column_id: $sourceColumnId
      entity_type: $entityType
      custom_instructions: $customInstructions
      additional_instructions: $additionalInstructions
      extra_settings: $extraSettings
    ) {
      column_id
    }
  }
`;

export const configureOpenBlockAiColumnMutation = gql`
  mutation ConfigureOpenBlockAiColumn(
    $boardId: ID!
    $columnId: ID!
    $aiQuery: String!
    $extraSettings: AiColumnExtraSettingsInput
  ) {
    configure_open_block_ai_column(
      board_id: $boardId
      column_id: $columnId
      ai_query: $aiQuery
      extra_settings: $extraSettings
    ) {
      column_id
    }
  }
`;

export const configureWriteMeAiColumnMutation = gql`
  mutation ConfigureWriteMeAiColumn(
    $boardId: ID!
    $columnId: ID!
    $aiQuery: String!
    $tone: AiColumnTone!
    $length: AiColumnOutputLength!
    $extraSettings: AiColumnExtraSettingsInput
  ) {
    configure_write_me_ai_column(
      board_id: $boardId
      column_id: $columnId
      ai_query: $aiQuery
      tone: $tone
      length: $length
      extra_settings: $extraSettings
    ) {
      column_id
    }
  }
`;

export const configurePersonAssignmentAiColumnMutation = gql`
  mutation ConfigurePersonAssignmentAiColumn(
    $boardId: ID!
    $columnId: ID!
    $sourceType: AiColumnSource!
    $sourceColumnId: ID
    $groups: [AiColumnPersonGroupInput!]!
    $extraSettings: AiColumnExtraSettingsInput
  ) {
    configure_person_assignment_ai_column(
      board_id: $boardId
      column_id: $columnId
      source_type: $sourceType
      source_column_id: $sourceColumnId
      groups: $groups
      extra_settings: $extraSettings
    ) {
      column_id
    }
  }
`;
