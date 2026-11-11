import { clientService } from '../services/client.service.js';

export async function getClients(req, res, next) {
  try {
    const result = await clientService.getClients(req.query, req.user);
    return res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
}

export async function getClientById(req, res, next) {
  try {
    const { id } = req.params;
    const client = await clientService.getClientById(id, req.user);
    return res.status(200).json({
      success: true,
      data: client,
    });
  } catch (error) {
    next(error);
  }
}

export async function getClientHoldings(req, res, next) {
  try {
    const { id } = req.params;
    const holdings = await clientService.getClientHoldings(id, req.user);
    return res.status(200).json({
      success: true,
      data: holdings,
    });
  } catch (error) {
    next(error);
  }
}

export async function getClientSignals(req, res, next) {
  try {
    const { id } = req.params;
    const signals = await clientService.getClientSignals(id, req.user);
    return res.status(200).json({
      success: true,
      data: signals,
    });
  } catch (error) {
    next(error);
  }
}

export async function getClientNbas(req, res, next) {
  try {
    const { id } = req.params;
    const nbas = await clientService.getClientNbas(id, req.user);
    return res.status(200).json({
      success: true,
      data: nbas,
    });
  } catch (error) {
    next(error);
  }
}

export async function generateClientNbas(req, res, next) {
  try {
    const { id } = req.params;
    const result = await clientService.generateClientNbas(id, req.user, req.requestId);

    return res.status(200).json({
      success: true,
      data: result,
      meta: {
        client_id: id,
        generated_count: result.generated_nbas?.length || 0,
        pipeline_run_id: result.pipeline_run_id || `run-${id}-${Date.now()}`,
        status: 'COMPLETE',
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function assignClientRm(req, res, next) {
  try {
    const { id } = req.params;
    const { rm_id } = req.body;
    const updated = await clientService.assignClientRm(id, rm_id, req.user);

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
