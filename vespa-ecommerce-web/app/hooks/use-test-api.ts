import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

const getHelloWorld = async () => {
  const { data } = await api.get('/'); 
  return data;
};

export const useTestApi = () => {
  return useQuery({
    queryKey: ['hello-world'],
    queryFn: getHelloWorld,
  });
};