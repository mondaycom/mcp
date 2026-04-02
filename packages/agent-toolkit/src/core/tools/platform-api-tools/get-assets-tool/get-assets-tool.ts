import { z } from 'zod';
import { ToolInputType, ToolOutputType, ToolType } from '../../../tool';
import { BaseMondayApiTool, createMondayApiAnnotations } from '../base-monday-api-tool';
import { getAssets } from './get-assets.graphql';
import { Asset } from 'src/monday-graphql/generated/graphql/graphql';

export const getAssetsToolSchema = {
  ids: z.array(z.string()).min(1).describe('Array of asset IDs to fetch'),
};

interface GetAssetsQuery {
  assets?: (Pick<Asset, 'id' | 'name' | 'file_extension' | 'file_size' | 'public_url' | 'url' | 'url_thumbnail' | 'created_at' | 'original_geometry'> & {
    uploaded_by: Pick<Asset['uploaded_by'], 'id' | 'name'>;
  } | null)[] | null;
}

export class GetAssetsTool extends BaseMondayApiTool<typeof getAssetsToolSchema, never> {
  name = 'get_assets';
  type = ToolType.READ;
  annotations = createMondayApiAnnotations({
    title: 'Get Assets',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  });

  getDescription(): string {
    return 'Get assets (files) by their IDs. Returns file metadata including name, extension, size, public URL (valid for 1 hour), thumbnail URL, upload date, and who uploaded it.';
  }

  getInputSchema(): typeof getAssetsToolSchema {
    return getAssetsToolSchema;
  }

  protected async executeInternal(input: ToolInputType<typeof getAssetsToolSchema>): Promise<ToolOutputType<never>> {
    const res = await this.mondayApi.request<GetAssetsQuery>(getAssets, { ids: input.ids });

    const assets = res.assets?.filter(Boolean);

    if (!assets || assets.length === 0) {
      return { content: `No assets found for the provided IDs: ${input.ids.join(', ')}` };
    }

    const results = assets.map((asset) => ({
      id: asset!.id,
      name: asset!.name,
      file_extension: asset!.file_extension,
      file_size: asset!.file_size,
      public_url: asset!.public_url,
      url: asset!.url,
      url_thumbnail: asset!.url_thumbnail ?? null,
      created_at: asset!.created_at ?? null,
      original_geometry: asset!.original_geometry ?? null,
      uploaded_by: asset!.uploaded_by,
    }));

    return { content: { results } };
  }
}
