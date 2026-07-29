/**

 * Purpose:

 * Party Workspace Audit History tab — list and filter immutable change records.

 *

 * Architecture:

 * UI → Server Actions → PartyAuditQueryService → AuditService

 *

 * Implementation Package:

 * BP-002 / IP-011 – Enterprise Audit History

 */



import type { CurrentBusinessContext } from "@/core/auth/types";

import {

  AUDIT_ENTITY_LABELS,

  AUDIT_OPERATION_LABELS,

  AUDIT_SOURCE_MODULE_LABELS,

  createAuditService,

} from "@/core/audit";

import { PartyError, PARTY_USER_MESSAGES } from "@/modules/party/errors";

import { createPartyRepository } from "@/modules/party/repositories/party-repository";

import type { PartyAuditHistoryPanelView } from "@/modules/party/types";

import {

  partyAuditListFiltersSchema,

  type PartyAuditListFiltersInput,

} from "@/modules/party/validators/party-audit-validators";



export class PartyAuditQueryService {

  constructor(

    private readonly partyRepository = createPartyRepository(),

    private readonly auditService = createAuditService()

  ) {}



  async getAuditPanel(

    context: CurrentBusinessContext,

    partyId: string,

    filters: PartyAuditListFiltersInput = { limit: 25, offset: 0 }

  ): Promise<PartyAuditHistoryPanelView> {

    const parsed = partyAuditListFiltersSchema.safeParse(filters);

    if (!parsed.success) {

      const first = parsed.error.issues[0];

      throw new PartyError(

        "INVALID_INPUT",

        first?.message ?? PARTY_USER_MESSAGES.INVALID_INPUT,

        400,

        first?.path[0] ? String(first.path[0]) : undefined

      );

    }



    await this.requireParty(context, partyId);



    const [listResult, filterOptions] = await Promise.all([

      this.auditService.listByPartyId(

        context.businessId,

        partyId,

        parsed.data

      ),

      this.auditService.getFilterOptions(context.businessId, partyId),

    ]);



    const allOperations = Object.entries(AUDIT_OPERATION_LABELS).map(

      ([code, label]) => ({ code, label })

    );

    const allEntities = Object.entries(AUDIT_ENTITY_LABELS).map(

      ([code, label]) => ({ code, label })

    );

    const allSourceModules = Object.entries(AUDIT_SOURCE_MODULE_LABELS).map(

      ([code, label]) => ({ code, label })

    );



    return {

      entries: listResult.entries,

      totalCount: listResult.totalCount,

      hasMore: listResult.hasMore,

      pageSize: listResult.pageSize,

      offset: listResult.offset,

      filterOptions: {

        operations:

          filterOptions.operations.length > 0

            ? filterOptions.operations

            : allOperations,

        entities:

          filterOptions.entities.length > 0

            ? filterOptions.entities

            : allEntities,

        users: filterOptions.users,

        sourceModules: allSourceModules,

      },

    };

  }



  async getAuditDetail(

    context: CurrentBusinessContext,

    partyId: string,

    auditId: string

  ) {

    await this.requireParty(context, partyId);

    const detail = await this.auditService.getEntryDetail(

      context.businessId,

      auditId

    );

    if (!detail) {

      throw new PartyError(

        "PARTY_NOT_FOUND",

        "Audit record not found.",

        404

      );

    }

    return detail;

  }



  private async requireParty(

    context: CurrentBusinessContext,

    partyId: string

  ) {

    const party = await this.partyRepository.findByIdIncludingArchived(

      context.businessId,

      partyId

    );

    if (!party) {

      throw new PartyError(

        "PARTY_NOT_FOUND",

        PARTY_USER_MESSAGES.PARTY_NOT_FOUND,

        404

      );

    }

    return party;

  }

}



export function createPartyAuditQueryService(): PartyAuditQueryService {

  return new PartyAuditQueryService();

}

