import { Worker, Job } from 'bullmq';
import { appendDeploymentLog, getDeploymentById, updateDeploymentStatus } from './database.js';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import LightningFS from '@isomorphic-git/lightning-fs';
import { DeploymentRecord } from './types.js';

const fs = new LightningFS('fs_namespace');
async function pendingToBuilding(deployment: DeploymentRecord) {
  if (deployment.source.type === 'git') {
    // TODO: clone the git repository
    appendDeploymentLog(deployment.id, 'Cloning repository...', new Date().toISOString());
     await git.clone({
        fs,
        http,
        dir: "../repo",
        url: deployment.source.url!,
        depth: 1,
        onProgress: (progress) => {
          appendDeploymentLog(deployment.id, `Cloning repository. ${progress.phase}: ${progress.loaded}/${progress.total}`, new Date().toISOString());
        },
        onMessage: (message) => {
          appendDeploymentLog(deployment.id, message, new Date().toISOString());
        },
    });
    updateDeploymentStatus(deployment.id, 'building');
    return
  }
  if (deployment.source.type === 'upload') {
    // TODO: extract the zip file
    appendDeploymentLog(deployment.id, `Extracting zip file: ${deployment.source.filename}`, new Date().toISOString());
    
    updateDeploymentStatus(deployment.id, 'building');
    return;
  }

}

async function buildingToDeploying(deployment: DeploymentRecord) {}
const worker = new Worker('deploy', async (job: Job) => {
  const deploymentId = job.data.deploymentId as string;
  const deployment = getDeploymentById(deploymentId);

  if (!deployment) {
    throw new Error(`Deployment ${deploymentId} not found`);
  }

  switch (deployment.status) {
    case 'pending':
      // start building
      pendingToBuilding(deployment);
    case 'building':
      
      buildingToDeploying(deployment);
    case 'deploying':
      // skip this deploy job
      return;
    case 'running':
      // skip this run job
      return;
    default:
      // unknown status
      throw new Error(`Unknown deployment status: ${deployment.status}`);
  }
});

worker.on('error', (error) => {
  console.error('Worker error', error);
});

worker.on('closed', () => {
  console.log('Worker closed');
});

worker.on('ready', () => {
  console.log('Worker ready');
});

worker.run();