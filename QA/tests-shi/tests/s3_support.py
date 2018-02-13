import os
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from typing import List


class S3Interface(object):
    """ Helper class for S3 objects manipulation.

        All testers and all tests use one testing bucket so we have to use "separate" spaces for objects.
        For that we use prefixes.

        A prefix to an object is composed this way: QA_S3_USER/QA_INSTANCE/QA_INSTANCE_VIRT
        where QA_S3_USER is defined as user@hostname in qa.cfg, QA_INSTANCE and QA_INSTANCE_VIRT are defined
        by testing framework when tests are running.

        Resulting prefix is i.e. qa@hive-at.salsitasoft.com/pullreq/5
    """
    def __init__(self):
        region_name = os.environ['QA_AWS_IMAGES_REGION']
        aws_access_key_id = os.environ['QA_AWS_IMAGES_ACCESS_KEY_ID']
        aws_secret_access_key = os.environ['QA_AWS_IMAGES_SECRET_KEY']

        self.bucket_name = os.environ['QA_AWS_IMAGES_BUCKET_NAME']
        self.prefix = '/'.join([
            os.environ['QA_S3_USER'],
            os.environ['QA_INSTANCE'],
            os.environ['QA_INSTANCE_VIRT']
        ])

        self.s3 = boto3.resource('s3',
                                 region_name=region_name,
                                 aws_access_key_id=aws_access_key_id,
                                 aws_secret_access_key=aws_secret_access_key)

    def delete_all_images(self) -> List[dict]:
        """ Delete all images (all objects) from configured s3 bucket that belong to configured tester,
            instance and virtual instance while not influencing other tests running in parallel.

            :return Keys of objects that were deleted
        """
        try:
            aws_response = self.s3.meta.client.list_objects(Bucket=self.bucket_name, Prefix=self.prefix)
        except (BotoCoreError, ClientError):
            print('Error: Failed to get S3 objects to delete')
            raise

        keys_to_delete = [obj['Key'] for obj in aws_response.get('Contents', [])]

        if keys_to_delete:
            objects_to_delete = dict(Objects=[{'Key': k} for k in keys_to_delete])

            try:
                aws_response = self.s3.meta.client.delete_objects(Bucket=self.bucket_name, Delete=objects_to_delete)
            except (BotoCoreError, ClientError):
                print('Error: Failed to delete S3 objects')
                raise

            return aws_response['Deleted']
        else:
            return []
